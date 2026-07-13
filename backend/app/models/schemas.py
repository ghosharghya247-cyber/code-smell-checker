from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime


class LocationSchema(BaseModel):
    line: int
    column: int
    end_line: Optional[int] = None


class CodeSmellSchema(BaseModel):
    id: str
    type: str
    severity: str
    score: int
    location: LocationSchema
    message: str
    recommendation: str
    examples: Optional[List[str]] = None


class SummarySchema(BaseModel):
    total_smells: int
    by_severity: Dict[str, int]
    overall_score: int
    language: str
    analyzed_at: str


class AnalysisResultSchema(BaseModel):
    analysis_id: str
    smells: List[CodeSmellSchema]
    summary: SummarySchema


class AnalyzeRequestSchema(BaseModel):
    code: str
    language: str
    source_name: Optional[str] = None


class AnalysisHistorySchema(BaseModel):
    id: str
    source_name: Optional[str]
    language: str
    total_smells: int
    overall_score: int
    created_at: str


class HistoryResponseSchema(BaseModel):
    analyses: List[AnalysisHistorySchema]
    total: int


class UserSchema(BaseModel):
    id: str
    email: str
    created_at: str


class LoginRequestSchema(BaseModel):
    email: EmailStr
    password: str


class SignupRequestSchema(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str


class AuthResponseSchema(BaseModel):
    token: str
    user: UserSchema


class SessionResponseSchema(BaseModel):
    user: Optional[UserSchema] = None
    is_authenticated: bool
