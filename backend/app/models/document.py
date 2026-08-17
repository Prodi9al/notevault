import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Category(str, enum.Enum):
    notes = "notes"
    past_questions = "past_questions"
    slides = "slides"
    other = "other"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (Index("ix_documents_course_code", "course_code"),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(2000), default="")
    course_code: Mapped[str] = mapped_column(String(50))
    category: Mapped[Category] = mapped_column(Enum(Category), default=Category.notes)
    s3_key: Mapped[str] = mapped_column(String(512))
    file_size_bytes: Mapped[int] = mapped_column(default=0)
    content_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
