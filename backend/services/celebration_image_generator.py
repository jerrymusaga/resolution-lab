"""
Resolution Lab - Celebration Image Generator

Uses Google's Gemini Nano Banana (gemini-2.5-flash-image) to generate
personalized celebration images when users complete check-ins.

Features:
- Generates celebration images for successful check-ins
- Generates encouraging images for incomplete check-ins
- Full Opik integration for tracing and evaluation
- Custom evaluators for image quality assessment
"""

import opik
from opik import track
from opik.opik_context import get_current_trace_data
import base64
import os
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from enum import Enum
import asyncio

# Check if google-genai is available
GENAI_AVAILABLE = False
genai_client = None

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    print("google-genai not available - image generation disabled")


class ImageType(str, Enum):
    """Type of celebration image to generate"""
    CELEBRATION = "celebration"  # For successful check-ins
    ENCOURAGEMENT = "encouragement"  # For incomplete check-ins
    STREAK_MILESTONE = "streak_milestone"  # For streak achievements (3, 7, 14, 30 days)
    GOAL_COMPLETE = "goal_complete"  # For completing a goal entirely


class CelebrationImageResult(BaseModel):
    """Result from image generation"""
    success: bool
    image_base64: Optional[str] = None
    image_type: ImageType
    prompt_used: str
    goal_title: str
    evaluation_score: Optional[float] = None
    evaluation_grade: Optional[str] = None
    error_message: Optional[str] = None
    opik_trace_id: Optional[str] = None


class ImageEvaluation(BaseModel):
    """Evaluation scores for generated image"""
    relevance_score: float  # How relevant to the goal (0-1)
    emotional_impact_score: float  # How emotionally impactful (0-1)
    quality_score: float  # Technical quality (0-1)
    appropriateness_score: float  # Content appropriateness (0-1)
    overall_score: float  # Weighted average
    grade: str  # A, B, C, D, F
    feedback: str


# Prompt templates for different image types
CELEBRATION_PROMPTS = {
    ImageType.CELEBRATION: """Create a vibrant, joyful celebration image for someone who just completed their goal: "{goal_title}".

Style: Modern, uplifting digital illustration with warm colors (gold, orange, teal).
Include: Abstract representations of achievement, sparkles, upward motion, celebration elements.
Mood: Triumphant, energizing, proud.
Do NOT include any text or words in the image.
Make it feel personal and rewarding.""",

    ImageType.ENCOURAGEMENT: """Create a gentle, encouraging image for someone working on their goal: "{goal_title}".

Style: Soft, calming digital illustration with supportive colors (soft blues, greens, warm pastels).
Include: Symbols of growth, progress, potential, new beginnings.
Mood: Hopeful, supportive, motivating without pressure.
Do NOT include any text or words in the image.
Make it feel like a warm hug and gentle push forward.""",

    ImageType.STREAK_MILESTONE: """Create an epic celebration image for someone who achieved a {streak_days}-day streak on their goal: "{goal_title}"!

Style: Dynamic, powerful digital illustration with fire/energy elements (oranges, reds, golds).
Include: Fire/flame motifs, the number {streak_days}, symbols of persistence and power.
Mood: Epic, powerful, legendary achievement.
Do NOT include any text or words in the image.
Make it feel like an achievement unlock in a video game.""",

    ImageType.GOAL_COMPLETE: """Create a grand completion celebration image for someone who FULLY COMPLETED their goal: "{goal_title}"!

Style: Majestic, triumphant digital illustration with rich colors (gold, purple, deep blue).
Include: Trophy/medal imagery, confetti, crown elements, symbols of mastery.
Mood: Victorious, proud, accomplished.
Do NOT include any text or words in the image.
Make it feel like the ultimate achievement.""",
}


class CelebrationImageGenerator:
    """
    Generates personalized celebration images using Gemini Nano Banana.

    Integrates with Opik for full observability and evaluation.
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the generator with Google API key."""
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.model = "gemini-2.5-flash-preview-image-generation"  # Nano Banana model
        self.client = None

        if GENAI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                print("Celebration image generator initialized with Nano Banana")
            except Exception as e:
                print(f"Failed to initialize genai client: {e}")

    def _get_prompt(
        self,
        image_type: ImageType,
        goal_title: str,
        streak_days: int = 0,
    ) -> str:
        """Generate the appropriate prompt based on image type."""
        template = CELEBRATION_PROMPTS.get(image_type, CELEBRATION_PROMPTS[ImageType.CELEBRATION])
        return template.format(
            goal_title=goal_title,
            streak_days=streak_days,
        )

    @track(name="evaluate_celebration_image", tags=["evaluation", "image"])
    def _evaluate_image(
        self,
        image_base64: str,
        goal_title: str,
        image_type: ImageType,
        prompt_used: str,
    ) -> ImageEvaluation:
        """
        Evaluate the generated image using Gemini as a judge.

        This creates a feedback loop to improve image generation over time.
        """
        if not self.client:
            return ImageEvaluation(
                relevance_score=0.5,
                emotional_impact_score=0.5,
                quality_score=0.5,
                appropriateness_score=1.0,
                overall_score=0.5,
                grade="C",
                feedback="Evaluation skipped - client not available"
            )

        evaluation_prompt = f"""You are evaluating an AI-generated celebration image.

Goal the user completed: "{goal_title}"
Image type: {image_type.value}
Original prompt used: {prompt_used}

Please evaluate this image on the following criteria (0.0 to 1.0 scale):

1. RELEVANCE (0-1): How well does the image relate to the goal "{goal_title}"?
2. EMOTIONAL_IMPACT (0-1): How effectively does it convey {image_type.value} emotions?
3. QUALITY (0-1): Technical quality - is it visually appealing, well-composed?
4. APPROPRIATENESS (0-1): Is the content appropriate and professional?

Respond ONLY with a JSON object in this exact format:
{{
    "relevance_score": 0.8,
    "emotional_impact_score": 0.9,
    "quality_score": 0.85,
    "appropriateness_score": 1.0,
    "feedback": "Brief feedback about the image"
}}"""

        try:
            # Decode base64 to bytes for the evaluation
            image_bytes = base64.b64decode(image_base64)

            response = self.client.models.generate_content(
                model="gemini-2.5-flash-preview-04-17",  # Use text model for evaluation
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": evaluation_prompt},
                            {"inline_data": {"mime_type": "image/png", "data": image_base64}}
                        ]
                    }
                ],
            )

            # Parse response
            import json
            response_text = response.text.strip()
            # Handle potential markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]

            scores = json.loads(response_text)

            # Calculate overall score (weighted average)
            overall = (
                scores["relevance_score"] * 0.3 +
                scores["emotional_impact_score"] * 0.35 +
                scores["quality_score"] * 0.25 +
                scores["appropriateness_score"] * 0.1
            )

            # Assign grade
            if overall >= 0.9:
                grade = "A"
            elif overall >= 0.8:
                grade = "B"
            elif overall >= 0.7:
                grade = "C"
            elif overall >= 0.6:
                grade = "D"
            else:
                grade = "F"

            return ImageEvaluation(
                relevance_score=scores["relevance_score"],
                emotional_impact_score=scores["emotional_impact_score"],
                quality_score=scores["quality_score"],
                appropriateness_score=scores["appropriateness_score"],
                overall_score=overall,
                grade=grade,
                feedback=scores.get("feedback", "")
            )

        except Exception as e:
            print(f"Image evaluation failed: {e}")
            return ImageEvaluation(
                relevance_score=0.7,
                emotional_impact_score=0.7,
                quality_score=0.7,
                appropriateness_score=1.0,
                overall_score=0.7,
                grade="C",
                feedback=f"Evaluation error: {str(e)}"
            )

    @track(name="generate_celebration_image", tags=["image", "celebration", "nano-banana"])
    async def generate(
        self,
        goal_title: str,
        image_type: ImageType = ImageType.CELEBRATION,
        streak_days: int = 0,
        evaluate: bool = True,
    ) -> CelebrationImageResult:
        """
        Generate a celebration image for a goal check-in.

        Args:
            goal_title: The title of the goal
            image_type: Type of image to generate
            streak_days: Current streak (for milestone images)
            evaluate: Whether to evaluate the generated image

        Returns:
            CelebrationImageResult with image data and evaluation
        """
        if not GENAI_AVAILABLE or not self.client:
            return CelebrationImageResult(
                success=False,
                image_type=image_type,
                prompt_used="",
                goal_title=goal_title,
                error_message="Image generation not available - google-genai not installed or API key missing"
            )

        # Generate prompt
        prompt = self._get_prompt(image_type, goal_title, streak_days)

        # Get trace ID for Opik
        trace_id = None
        try:
            trace_data = get_current_trace_data()
            if trace_data:
                trace_id = trace_data.id
        except Exception:
            pass

        try:
            # Generate image using Nano Banana
            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

            # Extract image from response
            image_base64 = None
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_base64 = part.inline_data.data
                    break

            if not image_base64:
                return CelebrationImageResult(
                    success=False,
                    image_type=image_type,
                    prompt_used=prompt,
                    goal_title=goal_title,
                    error_message="No image generated in response",
                    opik_trace_id=trace_id
                )

            # Evaluate the image if requested
            evaluation_score = None
            evaluation_grade = None
            if evaluate:
                evaluation = self._evaluate_image(
                    image_base64=image_base64,
                    goal_title=goal_title,
                    image_type=image_type,
                    prompt_used=prompt
                )
                evaluation_score = evaluation.overall_score
                evaluation_grade = evaluation.grade

                # Log evaluation to Opik
                try:
                    if trace_id:
                        client = opik.Opik()
                        scores = [
                            {"id": trace_id, "name": "image_relevance", "value": evaluation.relevance_score},
                            {"id": trace_id, "name": "image_emotional_impact", "value": evaluation.emotional_impact_score},
                            {"id": trace_id, "name": "image_quality", "value": evaluation.quality_score},
                            {"id": trace_id, "name": "image_overall", "value": evaluation.overall_score},
                        ]
                        client.log_traces_feedback_scores(scores=scores)
                except Exception as e:
                    print(f"Failed to log image evaluation to Opik: {e}")

            return CelebrationImageResult(
                success=True,
                image_base64=image_base64,
                image_type=image_type,
                prompt_used=prompt,
                goal_title=goal_title,
                evaluation_score=evaluation_score,
                evaluation_grade=evaluation_grade,
                opik_trace_id=trace_id
            )

        except Exception as e:
            return CelebrationImageResult(
                success=False,
                image_type=image_type,
                prompt_used=prompt,
                goal_title=goal_title,
                error_message=str(e),
                opik_trace_id=trace_id
            )

    @track(name="generate_checkin_image", tags=["image", "checkin"])
    async def generate_for_checkin(
        self,
        goal_title: str,
        completed: bool,
        current_streak: int = 0,
    ) -> CelebrationImageResult:
        """
        Generate appropriate image based on check-in result.

        Automatically selects image type based on:
        - completed: True = celebration, False = encouragement
        - streak milestones: 3, 7, 14, 30 days get special images
        """
        # Determine image type
        if completed:
            # Check for streak milestones
            if current_streak in [3, 7, 14, 30, 50, 100]:
                image_type = ImageType.STREAK_MILESTONE
            else:
                image_type = ImageType.CELEBRATION
        else:
            image_type = ImageType.ENCOURAGEMENT

        return await self.generate(
            goal_title=goal_title,
            image_type=image_type,
            streak_days=current_streak,
            evaluate=True
        )


# Singleton instance
_generator_instance: Optional[CelebrationImageGenerator] = None


def get_celebration_generator() -> CelebrationImageGenerator:
    """Get or create the celebration image generator singleton."""
    global _generator_instance

    if _generator_instance is None:
        _generator_instance = CelebrationImageGenerator()

    return _generator_instance


# Convenience function for quick generation
async def generate_checkin_celebration(
    goal_title: str,
    completed: bool,
    current_streak: int = 0,
) -> CelebrationImageResult:
    """
    Quick helper to generate a celebration image for a check-in.

    Usage:
        result = await generate_checkin_celebration(
            goal_title="Exercise 30 minutes",
            completed=True,
            current_streak=7
        )
        if result.success:
            # Use result.image_base64
    """
    generator = get_celebration_generator()
    return await generator.generate_for_checkin(
        goal_title=goal_title,
        completed=completed,
        current_streak=current_streak
    )
