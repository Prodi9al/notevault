import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.user import Role, User
from app.schemas.schemas import (
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
    PaginatedDocuments,
    PresignedURLRequest,
    PresignedURLResponse,
)
from app.storage.s3 import (
    delete_object,
    generate_download_presigned_url,
    generate_upload_presigned_url,
    get_s3_client,
    validate_upload,
)

router = APIRouter(prefix="/documents", tags=["documents"])

DOWNLOAD_EXPIRY_SECONDS = 300

COURSE_NAMES: dict[str, str] = {
    "CSPC132": "Physics for Computing Systems",
    "CSSD101": "Programming & Problem Solving",
    "CSSD102": "Programming with C++",
    "CSSD104": "Computer Architecture",
    "CSSD111": "Introduction to Computer Systems",
    "CSSD112": "Probability & Statistics",
    "CSSD201": "Data Structures & Algorithms",
    "CSSD202": "Object-Oriented Analysis Design & Programming",
    "CSSD203": "Microprocessors & Microcontrollers",
    "CSSD204": "Scripting Languages",
    "CSSD205": "Logic in Computer Science",
    "CSSD209": "Web Programming & Applications",
    "CSSD215": "Cyber Laws",
    "CSSD216": "Operating Systems",
    "CSSD218": "Fundamental Software Engineering",
    "CSSD223": "Systems Analysis & Design",
    "CSSD232": "Automata Theory",
    "CSNS141": "Digital Electronics",
    "CSNS241": "Data Communications",
    "CSNS242": "Computer Networks",
    "CSBC252": "Introduction to Cloud Computing",
    "GTGE121": "Introduction to Electronics",
    "MATH102": "Calculus (Differentiation & Integration)",
    "MATH103": "Discrete Mathematics for Computer Science",
    "MATH105": "Linear Algebra",
    "ENGL171": "Communication Skills I",
    "ENGL172": "Communication Skills II",
    "ENGL174": "Critical Thinking & Logical Reasoning",
    "FREN171": "Basic French I",
    "FREN172": "Basic French II",
}


@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = select(Document.course_code, func.count()).group_by(
        Document.course_code
    ).order_by(Document.course_code)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "course_code": code,
            "course_name": COURSE_NAMES.get(code, "Course materials"),
            "document_count": count,
        }
        for code, count in rows
    ]


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = select(Document.category, func.count()).group_by(
        Document.category
    ).order_by(Document.category)
    rows = (await db.execute(stmt)).all()
    return [{"category": cat, "document_count": count} for cat, count in rows]


def _apply_filters(stmt, course_code, category, q):
    if course_code:
        stmt = stmt.where(Document.course_code == course_code)
    if category:
        stmt = stmt.where(Document.category == category)
    if q:
        stmt = stmt.where(Document.title.ilike(f"%{q}%"))
    return stmt


@router.get("", response_model=PaginatedDocuments)
async def list_documents(
    course_code: str | None = Query(default=None),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedDocuments:
    base = _apply_filters(select(Document), course_code, category, q)
    count_stmt = _apply_filters(
        select(func.count()).select_from(Document), course_code, category, q
    )
    total_count = await db.scalar(count_stmt) or 0

    stmt = base.order_by(Document.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return PaginatedDocuments(
        items=list(items), total=total_count, page=page, page_size=page_size
    )


@router.post("/upload-url", response_model=PresignedURLResponse, status_code=status.HTTP_200_OK)
async def create_upload_url(
    payload: PresignedURLRequest,
    current_user: User = Depends(get_current_user),
) -> PresignedURLResponse:
    try:
        validate_upload(payload.filename, payload.content_type, payload.file_size_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    ext = os.path.splitext(payload.filename)[1].lower()
    s3_key = f"uploads/{current_user.id}/{uuid.uuid4()}{ext}"
    upload_url = generate_upload_presigned_url(s3_key, payload.content_type)
    return PresignedURLResponse(upload_url=upload_url, s3_key=s3_key)


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    client = get_s3_client()
    try:
        client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=payload.s3_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded object not found in storage. Upload to the presigned URL first.",
        )
    doc = Document(
        title=payload.title,
        description=payload.description,
        course_code=payload.course_code,
        category=payload.category,
        s3_key=payload.s3_key,
        file_size_bytes=payload.file_size_bytes,
        content_type=payload.content_type,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)) -> Document:
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    download_url = generate_download_presigned_url(doc.s3_key, DOWNLOAD_EXPIRY_SECONDS)
    response = DocumentResponse.model_validate(doc)
    response.download_url = download_url
    return response


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.uploaded_by != current_user.id and current_user.role != Role.staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(doc, field, value)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.uploaded_by != current_user.id and current_user.role != Role.staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    delete_object(doc.s3_key)
    await db.delete(doc)
    await db.commit()
