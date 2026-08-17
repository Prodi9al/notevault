import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import COOKIE_NAME, get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models.user import Role, User
from app.schemas.schemas import LoginRequest, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger("notevault")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=Role.student,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("user_registered", extra={"user_id": user.id, "email": user.email})
    return user


@router.post("/login")
async def login(
    payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> dict:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(user.id, user.role)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=int(timedelta(minutes=settings.JWT_EXPIRE_MINUTES).total_seconds()),
        path="/",
    )
    logger.info("user_login", extra={"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
