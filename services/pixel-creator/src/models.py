from pydantic import BaseModel


class CreatePixelRequest(BaseModel):
    name: str
    url: str


class CreatePixelResponse(BaseModel):
    success: bool
    pixel_code: str | None = None
    pixel_id: str | None = None
    error: str | None = None
