from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Optional
from datetime import datetime, date

from app.models.base import StatusEnum, PriorityEnum, IssueTypeEnum


# --- User ---
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    display_name: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None


class UserOut(UserBase):
    id: str
    display_name: Optional[str] = None

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
    key_prefix: str = Field(default="PRJ", max_length=8)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    key_prefix: Optional[str] = Field(default=None, max_length=8)


class ProjectMemberOut(BaseModel):
    user: UserOut
    role: str = "MEMBER"

    class Config:
        from_attributes = True


class Project(ProjectBase):
    id: str
    owner_id: str
    members: List[UserOut] = []

    class Config:
        from_attributes = True


class ProjectMemberAdd(BaseModel):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str = Field(default="MEMBER", pattern="^(ADMIN|MEMBER|VIEWER)$")

    @model_validator(mode="after")
    def user_id_or_email(self):
        has_uid = bool(self.user_id)
        has_em = bool(self.email)
        if not has_uid and not has_em:
            raise ValueError("Укажите user_id или email зарегистрированного пользователя")
        if has_uid and has_em:
            raise ValueError("Укажите только user_id или только email")
        return self


# --- Sprint ---
class SprintBase(BaseModel):
    name: str
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = False


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class Sprint(SprintBase):
    id: str
    project_id: str

    class Config:
        from_attributes = True


# --- Tasks ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: StatusEnum = StatusEnum.TODO
    priority: PriorityEnum = PriorityEnum.MEDIUM
    issue_type: IssueTypeEnum = IssueTypeEnum.TASK
    deadline: Optional[datetime] = None
    story_points: Optional[int] = Field(default=None, ge=0, le=100)
    sort_order: int = 0


class TaskCreate(TaskBase):
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
    category_ids: List[str] = []
    executor_id: Optional[str] = None
    observer_ids: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusEnum] = None
    priority: Optional[PriorityEnum] = None
    issue_type: Optional[IssueTypeEnum] = None
    deadline: Optional[datetime] = None
    story_points: Optional[int] = Field(default=None, ge=0, le=100)
    sort_order: Optional[int] = None
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
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
    sprint_id: Optional[str] = None
    sprint: Optional[Sprint] = None
    parent_id: Optional[str] = None
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


# --- Work logs ---
class WorkLogCreate(BaseModel):
    minutes_spent: int = Field(ge=1, le=24 * 60)
    note: Optional[str] = None


class WorkLog(BaseModel):
    id: str
    task_id: str
    user_id: str
    user: Optional[UserOut] = None
    minutes_spent: int
    note: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


# --- Activity ---
class ActivityEntry(BaseModel):
    id: str
    user_id: str
    user: Optional[UserOut] = None
    action: str
    entity_type: str
    entity_id: str
    meta: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Notifications ---
class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


# --- Search ---
class SearchHitTask(BaseModel):
    id: str
    title: str
    status: str
    issue_type: str
    project_id: Optional[str] = None


class SearchResponse(BaseModel):
    tasks: List[SearchHitTask]
