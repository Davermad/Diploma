from pydantic import BaseModel, EmailStr, model_validator
from typing import List, Optional
from datetime import datetime
from app.models.base import StatusEnum, PriorityEnum

# --- User (must be before Task for nesting) ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: str
    class Config:
        from_attributes = True

# --- Categories ---
class CategoryBase(BaseModel):
    name: str
    color: str = "#1890ff"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class Category(CategoryBase):
    id: str
    class Config:
        from_attributes = True

# --- Projects ---
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class Project(ProjectBase):
    id: str
    owner_id: str
    members: List[UserOut] = []
    class Config:
        from_attributes = True

class ProjectMemberAdd(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def user_id_or_email(self):
        has_uid = bool(self.user_id)
        has_em = bool(self.email)
        if not has_uid and not has_em:
            raise ValueError("Укажите user_id или email зарегистрированного пользователя")
        if has_uid and has_em:
            raise ValueError("Укажите только user_id или только email")
        return self

# --- Tasks ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: StatusEnum = StatusEnum.TODO
    priority: PriorityEnum = PriorityEnum.MEDIUM
    deadline: Optional[datetime] = None

class TaskCreate(TaskBase):
    project_id: Optional[str] = None
    category_ids: List[str] = []
    executor_id: Optional[str] = None
    observer_ids: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusEnum] = None
    priority: Optional[PriorityEnum] = None
    deadline: Optional[datetime] = None
    project_id: Optional[str] = None
    category_ids: Optional[List[str]] = None
    executor_id: Optional[str] = None
    observer_ids: Optional[List[str]] = None

class Task(TaskBase):
    id: str
    owner_id: str
    creator_id: str
    creator: Optional[UserOut] = None
    executor_id: Optional[str] = None
    executor: Optional[UserOut] = None
    observers: List[UserOut] = []
    project_id: Optional[str] = None
    project: Optional[Project] = None
    categories: List[Category] = []

    class Config:
        from_attributes = True

# --- Task Comments ---
class TaskCommentCreate(BaseModel):
    text: str

class TaskCommentUpdate(BaseModel):
    text: str

class TaskComment(BaseModel):
    id: str
    task_id: str
    user_id: str
    user: Optional[UserOut] = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Project Chat ---
class ProjectMessageCreate(BaseModel):
    text: str

class ProjectMessage(BaseModel):
    id: str
    project_id: str
    user_id: str
    user: Optional[UserOut] = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

class GlobalMessageCreate(BaseModel):
    text: str


class GlobalMessage(BaseModel):
    id: str
    user_id: str
    user: Optional[UserOut] = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
