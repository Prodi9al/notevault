from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.document import Category
from app.models.user import Role


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class DocumentCreate(BaseModel):
    title: str
    description: str = ""
    course_code: str
    category: Category = Category.notes
    s3_key: str
    file_size_bytes: int = 0
    content_type: str = "application/octet-stream"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_code: Optional[str] = None
    category: Optional[Category] = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    description: str
    course_code: str
    category: Category
    s3_key: str
    file_size_bytes: int
    content_type: str
    uploaded_by: str
    created_at: datetime
    updated_at: datetime
    download_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PresignedURLRequest(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int


class PresignedURLResponse(BaseModel):
    upload_url: str
    s3_key: str


class PaginatedDocuments(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
