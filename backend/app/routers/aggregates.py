from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document

router = APIRouter(tags=["aggregates"])


@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = (
        select(Document.course_code, func.count())
        .group_by(Document.course_code)
    )
    rows = (await db.execute(stmt)).all()
    counts: dict[str, int] = {code: count for code, count in rows}

    known = list(COURSE_NAMES.items())
    known_codes = {code for code, _ in known}

    merged = [
        {"course_code": code, "course_name": name, "document_count": counts.get(code, 0)}
        for code, name in known
    ]
    for code, count in counts.items():
        if code not in known_codes:
            merged.append(
                {"course_code": code, "course_name": "Course materials", "document_count": count}
            )

    merged.sort(key=lambda c: c["course_code"])
    return merged


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = (
        select(Document.category, func.count())
        .group_by(Document.category)
        .order_by(Document.category)
    )
    rows = (await db.execute(stmt)).all()
    return [{"category": cat, "document_count": count} for cat, count in rows]


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
