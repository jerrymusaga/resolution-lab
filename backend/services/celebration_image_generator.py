"""
Resolution Lab - Celebration Image Generator

Uses Google's Gemini Nano Banana (gemini-2.5-flash-image) to generate
personalized celebration images when users complete check-ins.

Features:
- Generates celebration images for successful check-ins
- Generates encouraging images for incomplete check-ins
- Goal-type specific imagery (fitness, reading, learning, etc.)
- Randomized style variations for unique images
- Full Opik integration for tracing and evaluation
- Custom evaluators for image quality assessment
"""

import opik
from opik import track
from opik.opik_context import get_current_trace_data
import base64
import os
import random
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from pydantic import BaseModel
from enum import Enum
import asyncio
import re

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
    goal_category: Optional[str] = None  # Detected goal category for personalization
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


# ===================
# Goal Category Detection & Visual Elements
# ===================

class GoalCategory(str, Enum):
    """Categories of goals for personalized imagery"""
    FITNESS = "fitness"
    READING = "reading"
    LEARNING = "learning"
    MEDITATION = "meditation"
    NUTRITION = "nutrition"
    CREATIVITY = "creativity"
    PRODUCTIVITY = "productivity"
    SOCIAL = "social"
    FINANCE = "finance"
    SLEEP = "sleep"
    HOBBY = "hobby"
    GENERAL = "general"


# Keywords to detect goal categories
GOAL_CATEGORY_KEYWORDS: Dict[GoalCategory, List[str]] = {
    GoalCategory.FITNESS: [
        "exercise", "workout", "gym", "run", "running", "jog", "walk", "walking",
        "swim", "cycling", "bike", "yoga", "stretch", "lift", "weights", "cardio",
        "fitness", "sport", "training", "pushup", "situp", "plank", "squat",
        "steps", "active", "movement", "hiking", "marathon", "muscle"
    ],
    GoalCategory.READING: [
        "read", "reading", "book", "books", "pages", "chapter", "novel",
        "literature", "library", "kindle", "audiobook", "magazine", "article"
    ],
    GoalCategory.LEARNING: [
        "learn", "study", "course", "class", "lesson", "practice", "skill",
        "language", "coding", "programming", "math", "science", "education",
        "tutorial", "certificate", "exam", "homework", "flashcard", "duolingo"
    ],
    GoalCategory.MEDITATION: [
        "meditate", "meditation", "mindful", "mindfulness", "breathe", "breathing",
        "calm", "relax", "zen", "peace", "quiet", "reflect", "gratitude", "journal",
        "prayer", "spiritual"
    ],
    GoalCategory.NUTRITION: [
        "eat", "diet", "food", "meal", "cook", "cooking", "vegetable", "fruit",
        "healthy", "water", "drink", "hydrate", "vitamin", "protein", "calorie",
        "fast", "fasting", "vegan", "nutrition", "breakfast", "lunch", "dinner"
    ],
    GoalCategory.CREATIVITY: [
        "art", "draw", "drawing", "paint", "painting", "write", "writing",
        "music", "instrument", "guitar", "piano", "sing", "dance", "craft",
        "design", "photo", "photography", "create", "creative", "sketch", "poem"
    ],
    GoalCategory.PRODUCTIVITY: [
        "work", "task", "project", "organize", "clean", "declutter", "email",
        "inbox", "meeting", "goal", "habit", "routine", "schedule", "plan",
        "focus", "productive", "efficiency", "todo", "checklist"
    ],
    GoalCategory.SOCIAL: [
        "call", "friend", "family", "social", "connect", "relationship",
        "date", "meet", "network", "community", "volunteer", "help", "chat"
    ],
    GoalCategory.FINANCE: [
        "save", "saving", "money", "budget", "invest", "financial", "expense",
        "spend", "bank", "debt", "income", "frugal", "wealth"
    ],
    GoalCategory.SLEEP: [
        "sleep", "bed", "wake", "morning", "night", "rest", "nap", "early",
        "alarm", "bedtime", "insomnia"
    ],
    GoalCategory.HOBBY: [
        "game", "gaming", "garden", "gardening", "pet", "travel", "movie",
        "tv", "show", "collection", "build", "diy", "puzzle", "chess"
    ],
}

# Visual elements and imagery for each category
CATEGORY_VISUAL_ELEMENTS: Dict[GoalCategory, Dict[str, Any]] = {
    GoalCategory.FITNESS: {
        "imagery": ["running figure silhouette", "dumbbells", "mountain peak", "sunrise over trail", "athletic shoes", "finish line ribbon"],
        "colors": ["energetic orange", "vibrant red", "electric blue", "neon green"],
        "mood_words": ["powerful", "dynamic", "energizing", "athletic"],
        "background": ["stadium lights", "mountain landscape", "gym environment", "outdoor track"],
    },
    GoalCategory.READING: {
        "imagery": ["open book with glowing pages", "stack of books", "cozy reading nook", "magical floating letters", "library shelves", "reading glasses"],
        "colors": ["warm amber", "rich burgundy", "forest green", "cream white"],
        "mood_words": ["cozy", "intellectual", "peaceful", "enlightening"],
        "background": ["library interior", "window with rain", "fireplace glow", "starlit study"],
    },
    GoalCategory.LEARNING: {
        "imagery": ["lightbulb moment", "graduation cap", "brain with gears", "ascending staircase of knowledge", "puzzle pieces connecting", "certificate"],
        "colors": ["bright yellow", "royal blue", "white", "silver"],
        "mood_words": ["enlightening", "progressive", "ambitious", "curious"],
        "background": ["classroom", "digital interface", "starry universe", "ascending pathway"],
    },
    GoalCategory.MEDITATION: {
        "imagery": ["lotus flower", "peaceful silhouette", "zen stones", "rippling water", "glowing aura", "mandala pattern"],
        "colors": ["soft lavender", "serene blue", "gentle pink", "misty white"],
        "mood_words": ["tranquil", "peaceful", "centered", "harmonious"],
        "background": ["mountain temple", "zen garden", "calm lake", "sunset clouds"],
    },
    GoalCategory.NUTRITION: {
        "imagery": ["colorful fresh vegetables", "fruit bowl", "healthy meal plate", "water droplets", "green smoothie", "farm fresh produce"],
        "colors": ["fresh green", "vibrant orange", "berry purple", "sunny yellow"],
        "mood_words": ["fresh", "nourishing", "vibrant", "wholesome"],
        "background": ["kitchen counter", "garden harvest", "farmers market", "sunny orchard"],
    },
    GoalCategory.CREATIVITY: {
        "imagery": ["paint splashes", "musical notes", "artist palette", "dancing figure", "canvas and brushes", "creative explosion"],
        "colors": ["rainbow spectrum", "artistic magenta", "creative purple", "bold cyan"],
        "mood_words": ["expressive", "imaginative", "artistic", "inspired"],
        "background": ["art studio", "concert hall", "gallery space", "creative workshop"],
    },
    GoalCategory.PRODUCTIVITY: {
        "imagery": ["checkmark", "rising graph", "organized desk", "rocket launch", "target bullseye", "gear mechanism"],
        "colors": ["professional navy", "success green", "clean white", "accent gold"],
        "mood_words": ["efficient", "accomplished", "organized", "successful"],
        "background": ["modern office", "organized workspace", "city skyline", "command center"],
    },
    GoalCategory.SOCIAL: {
        "imagery": ["connected hearts", "group silhouettes", "handshake", "conversation bubbles", "gathering of friends", "family tree"],
        "colors": ["warm coral", "friendly orange", "connection blue", "love pink"],
        "mood_words": ["connected", "warm", "friendly", "loving"],
        "background": ["cafe gathering", "park picnic", "cozy living room", "community event"],
    },
    GoalCategory.FINANCE: {
        "imagery": ["piggy bank", "growing money tree", "golden coins", "upward arrow graph", "secure vault", "prosperity symbols"],
        "colors": ["wealthy gold", "money green", "secure navy", "prosperity purple"],
        "mood_words": ["prosperous", "secure", "growing", "abundant"],
        "background": ["bank interior", "treasure room", "financial district", "prosperity garden"],
    },
    GoalCategory.SLEEP: {
        "imagery": ["crescent moon", "peaceful clouds", "cozy bed", "starry night", "sleeping figure", "dream clouds"],
        "colors": ["midnight blue", "soft purple", "starlight silver", "dreamy lavender"],
        "mood_words": ["restful", "peaceful", "dreamy", "rejuvenating"],
        "background": ["night sky", "cozy bedroom", "moonlit landscape", "cloud kingdom"],
    },
    GoalCategory.HOBBY: {
        "imagery": ["hobby tools", "collection display", "game controller", "garden plants", "craft materials", "adventure map"],
        "colors": ["fun teal", "hobby orange", "playful yellow", "adventure green"],
        "mood_words": ["fun", "enjoyable", "passionate", "adventurous"],
        "background": ["hobby room", "game space", "garden", "adventure setting"],
    },
    GoalCategory.GENERAL: {
        "imagery": ["star burst", "trophy", "medal", "fireworks", "confetti explosion", "victory pose"],
        "colors": ["gold", "silver", "royal purple", "celebration red"],
        "mood_words": ["triumphant", "victorious", "accomplished", "proud"],
        "background": ["celebration stage", "podium", "fireworks sky", "achievement hall"],
    },
}

# Style variations for uniqueness
STYLE_VARIATIONS = [
    "flat design illustration",
    "3D rendered",
    "watercolor painting style",
    "digital art with gradients",
    "minimalist vector art",
    "vibrant pop art style",
    "soft cel-shaded illustration",
    "geometric abstract art",
]

COMPOSITION_VARIATIONS = [
    "centered composition with radial elements",
    "dynamic diagonal composition",
    "symmetrical balanced layout",
    "rule of thirds with focal point",
    "circular framing",
    "layered depth composition",
]

LIGHTING_VARIATIONS = [
    "golden hour warm lighting",
    "dramatic backlighting with silhouette",
    "soft ambient glow",
    "bright celebratory spotlights",
    "magical ethereal light rays",
    "sunrise/dawn lighting",
]


def detect_goal_category(goal_title: str) -> Tuple[GoalCategory, float]:
    """
    Detect the category of a goal based on keywords in the title.

    Returns:
        Tuple of (category, confidence_score)
    """
    title_lower = goal_title.lower()

    best_category = GoalCategory.GENERAL
    best_score = 0

    for category, keywords in GOAL_CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in title_lower:
                # Exact word match gets higher score
                if re.search(rf'\b{re.escape(keyword)}\b', title_lower):
                    score += 2
                else:
                    score += 1

        if score > best_score:
            best_score = score
            best_category = category

    # Calculate confidence (0-1)
    confidence = min(best_score / 4, 1.0) if best_score > 0 else 0.3

    return best_category, confidence


def get_personalized_visual_elements(
    goal_title: str,
    image_type: "ImageType",
    streak_days: int = 0,
) -> Dict[str, Any]:
    """
    Get personalized visual elements based on goal category and context.

    Returns a dict with:
    - category: detected goal category
    - imagery: list of relevant visual elements
    - colors: color palette
    - style: art style
    - composition: layout style
    - lighting: lighting style
    - mood: mood descriptors
    - background: background setting
    """
    category, confidence = detect_goal_category(goal_title)
    elements = CATEGORY_VISUAL_ELEMENTS[category]

    # Random selections for variety
    selected_imagery = random.sample(elements["imagery"], min(2, len(elements["imagery"])))
    selected_colors = random.sample(elements["colors"], min(2, len(elements["colors"])))
    selected_mood = random.sample(elements["mood_words"], min(2, len(elements["mood_words"])))
    selected_background = random.choice(elements["background"])

    selected_style = random.choice(STYLE_VARIATIONS)
    selected_composition = random.choice(COMPOSITION_VARIATIONS)
    selected_lighting = random.choice(LIGHTING_VARIATIONS)

    # Add streak-specific elements for milestones
    streak_elements = []
    if streak_days >= 100:
        streak_elements = ["legendary crown", "diamond trophy", "100 achievement badge"]
    elif streak_days >= 50:
        streak_elements = ["platinum medal", "elite star badge"]
    elif streak_days >= 30:
        streak_elements = ["golden trophy", "30-day champion badge"]
    elif streak_days >= 14:
        streak_elements = ["silver medal", "two-week warrior badge"]
    elif streak_days >= 7:
        streak_elements = ["bronze star", "weekly champion ribbon"]
    elif streak_days >= 3:
        streak_elements = ["starter badge", "momentum flame"]

    return {
        "category": category,
        "confidence": confidence,
        "imagery": selected_imagery + streak_elements,
        "colors": selected_colors,
        "style": selected_style,
        "composition": selected_composition,
        "lighting": selected_lighting,
        "mood": selected_mood,
        "background": selected_background,
    }


# Base prompt templates - these get enhanced with personalized elements
BASE_PROMPT_TEMPLATES = {
    ImageType.CELEBRATION: """Create a vibrant, joyful celebration image for someone who just completed their goal: "{goal_title}".

Art Style: {style}
Color Palette: {colors}
Visual Elements: {imagery}
Background Setting: {background}
Composition: {composition}
Lighting: {lighting}
Mood: {mood}, triumphant, rewarding

IMPORTANT: Do NOT include any text, words, letters, or numbers in the image.
Make it feel personal, specific to this achievement, and emotionally rewarding.""",

    ImageType.ENCOURAGEMENT: """Create a gentle, encouraging image for someone working on their goal: "{goal_title}".

Art Style: {style} with soft, approachable feel
Color Palette: soft pastels blended with {colors}
Visual Elements: {imagery}, symbols of growth and potential
Background Setting: {background} with hopeful atmosphere
Composition: {composition}
Lighting: soft ambient glow with {lighting}
Mood: hopeful, supportive, {mood}

IMPORTANT: Do NOT include any text, words, letters, or numbers in the image.
Make it feel like a warm encouragement - tomorrow is another opportunity.""",

    ImageType.STREAK_MILESTONE: """Create an EPIC celebration image for someone who achieved a {streak_days}-day streak on their goal: "{goal_title}"!

Art Style: {style} with epic, legendary feel
Color Palette: {colors} with fire/energy accents (gold, orange flames)
Visual Elements: {imagery}, {streak_elements}, epic achievement symbols
Background Setting: {background} transformed into an epic celebration scene
Composition: {composition} with dramatic emphasis
Lighting: {lighting} with dramatic energy bursts
Mood: LEGENDARY, {mood}, unstoppable, powerful

This is a {streak_days}-DAY STREAK - make it feel like unlocking an epic achievement!
IMPORTANT: Do NOT include any text, words, letters, or numbers in the image.""",

    ImageType.GOAL_COMPLETE: """Create a GRAND completion celebration image for someone who FULLY COMPLETED their goal: "{goal_title}"!

Art Style: {style} with majestic, premium feel
Color Palette: rich {colors} with gold and royal purple accents
Visual Elements: {imagery}, grand trophy, victory crown, confetti explosion
Background Setting: {background} transformed into a victory celebration
Composition: {composition} with triumphant focal point
Lighting: {lighting} with golden victory rays
Mood: VICTORIOUS, {mood}, ultimate accomplishment, mastery achieved

This is COMPLETE GOAL MASTERY - make it feel like the ultimate achievement!
IMPORTANT: Do NOT include any text, words, letters, or numbers in the image.""",
}


class CelebrationImageGenerator:
    """
    Generates personalized celebration images using Gemini Nano Banana.

    Integrates with Opik for full observability and evaluation.

    Uses separate API key (GOOGLE_IMAGE_API_KEY) to avoid consuming tokens
    from the main message generation quota.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the generator with Google API key.

        Priority for API key:
        1. Passed api_key parameter
        2. GOOGLE_IMAGE_API_KEY (dedicated image generation key)
        3. GOOGLE_API_KEY (fallback to shared key)
        """
        self.api_key = api_key or os.getenv("GOOGLE_IMAGE_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model = "gemini-2.5-flash-image"  # Nano Banana - Gemini's native image generation model
        self.client = None

        # Track which key is being used for logging
        key_source = "passed parameter"
        if not api_key:
            if os.getenv("GOOGLE_IMAGE_API_KEY"):
                key_source = "GOOGLE_IMAGE_API_KEY"
            elif os.getenv("GOOGLE_API_KEY"):
                key_source = "GOOGLE_API_KEY (fallback)"

        if GENAI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                print(f"✅ Celebration image generator initialized with Nano Banana (using {key_source})")
            except Exception as e:
                print(f"❌ Failed to initialize genai client: {e}")
        else:
            if not self.api_key:
                print("⚠️ Image generation disabled - set GOOGLE_IMAGE_API_KEY or GOOGLE_API_KEY")

    def _get_prompt(
        self,
        image_type: ImageType,
        goal_title: str,
        streak_days: int = 0,
    ) -> str:
        """
        Generate a personalized prompt based on image type, goal category, and context.

        Uses goal-type detection to include relevant visual elements and
        randomized style variations for unique images.
        """
        # Get personalized visual elements based on goal
        elements = get_personalized_visual_elements(
            goal_title=goal_title,
            image_type=image_type,
            streak_days=streak_days,
        )

        # Get the base template
        template = BASE_PROMPT_TEMPLATES.get(image_type, BASE_PROMPT_TEMPLATES[ImageType.CELEBRATION])

        # Format streak elements for milestone images
        streak_elements_str = ", ".join(elements["imagery"][-2:]) if streak_days >= 3 else "achievement badge"

        # Build the personalized prompt
        prompt = template.format(
            goal_title=goal_title,
            streak_days=streak_days,
            style=elements["style"],
            colors=", ".join(elements["colors"]),
            imagery=", ".join(elements["imagery"]),
            background=elements["background"],
            composition=elements["composition"],
            lighting=elements["lighting"],
            mood=", ".join(elements["mood"]),
            streak_elements=streak_elements_str,
        )

        # Log detected category for debugging
        print(f"🎨 Image prompt generated for category: {elements['category'].value} (confidence: {elements['confidence']:.2f})")

        return prompt

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
        # Detect goal category early for inclusion in result
        detected_category, _ = detect_goal_category(goal_title)
        category_str = detected_category.value

        if not GENAI_AVAILABLE or not self.client:
            return CelebrationImageResult(
                success=False,
                image_type=image_type,
                prompt_used="",
                goal_title=goal_title,
                goal_category=category_str,
                error_message="Image generation not available - google-genai not installed or API key missing"
            )

        # Generate personalized prompt based on goal category
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
            # Add unique identifier to prompt to prevent caching
            import time
            unique_id = f"[Generation ID: {int(time.time() * 1000)}]"
            full_prompt = f"{prompt}\n\n{unique_id}"

            # Log the full prompt for debugging
            print(f"🎨 Full image prompt:\n{full_prompt[:500]}...")

            # Generate image using Nano Banana with high temperature for variety
            response = self.client.models.generate_content(
                model=self.model,
                contents=[full_prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    temperature=1.0,  # Higher temperature for more variety
                ),
            )

            # Extract image from response
            image_base64 = None
            print(f"🔍 Response candidates: {len(response.candidates) if response.candidates else 0}")

            if response.candidates and len(response.candidates) > 0:
                print(f"🔍 Response parts: {len(response.candidates[0].content.parts) if response.candidates[0].content.parts else 0}")
                for i, part in enumerate(response.candidates[0].content.parts):
                    print(f"🔍 Part {i}: has inline_data={hasattr(part, 'inline_data')}")
                    if hasattr(part, 'inline_data') and part.inline_data:
                        image_base64 = part.inline_data.data
                        print(f"✅ Found image data (length: {len(image_base64) if image_base64 else 0})")
                        break

            if not image_base64:
                return CelebrationImageResult(
                    success=False,
                    image_type=image_type,
                    prompt_used=prompt,
                    goal_title=goal_title,
                    goal_category=category_str,
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
                goal_category=category_str,
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
                goal_category=category_str,
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
