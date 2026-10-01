from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pypdf import PdfReader
from io import BytesIO
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = None

if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)

resume_text = ""
generated_questions = []


@app.get("/")
def home():
    return {
        "message": "AI Interview Coach Backend Running"
    }


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):

    global resume_text

    file_bytes = await file.read()

    try:

        if file.filename.lower().endswith(".pdf"):

            pdf = PdfReader(BytesIO(file_bytes))

            resume_text = ""

            for page in pdf.pages:

                text = page.extract_text()

                if text:
                    resume_text += text + "\n"

        else:

            resume_text = file_bytes.decode("utf-8")

    except Exception as e:

        resume_text = ""

        return {
            "error": "Could not read resume",
            "details": str(e)
        }

    if not resume_text.strip():

        return {
            "error": "Could not extract text from the resume."
        }

    return {
        "message": "Resume uploaded and text extracted successfully",
        "filename": file.filename,
        "text_length": len(resume_text)
    }


@app.get("/questions")
def questions():

    return {
        "questions": generated_questions
    }


@app.get("/generate-questions")
def generate_questions():

    global generated_questions

    if not GROQ_API_KEY or client is None:

        return {
            "error": "Groq API key is not configured."
        }

    if not resume_text.strip():

        return {
            "error": "Please upload your resume first."
        }

    prompt = f"""
You are an AI Interview Coach.

Analyze the candidate's resume carefully.

Generate exactly 15 personalized interview questions
based specifically on the candidate's resume.

Cover:

1. Self introduction
2. Education
3. Technical skills
4. Programming languages
5. Projects
6. Project technologies
7. Candidate's contribution
8. Challenges faced
9. Problem solving
10. Databases
11. Web development
12. AI/ML if present
13. DevOps if present
14. Scenario-based technical questions
15. HR/behavioral questions

IMPORTANT:

- Questions must be relevant to the resume.
- Use actual projects, technologies and skills from the resume.
- Do not provide answers.
- Generate exactly 15 questions.
- Return ONLY the questions.
- Put one question on each line.
- Do not add headings.

Candidate Resume:

{resume_text}
"""

    try:

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI Interview Coach."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1500
        )

        result = response.choices[0].message.content

        generated_questions = []

        for line in result.split("\n"):

            line = line.strip()

            if not line:
                continue

            if "." in line[:4]:

                first_part = line.split(".", 1)

                if first_part[0].isdigit():

                    line = first_part[1].strip()

            if line.startswith("-"):

                line = line[1:].strip()

            if line:

                generated_questions.append(line)

        generated_questions = generated_questions[:15]

        return {
            "questions": generated_questions
        }

    except Exception as e:

        return {
            "error": "Groq question generation failed.",
            "details": str(e)
        }


@app.post("/evaluate-answer")
def evaluate_answer(question: str, answer: str):

    question = question.strip()
    answer = answer.strip()

    if len(answer) == 0:

        return {
            "question": question,
            "answer": answer,
            "score": 0,
            "feedback": "Please provide an answer.",
            "word_count": 0
        }

    words = answer.split()

    word_count = len(words)

    if word_count < 10:
        score = 3

    elif word_count < 25:
        score = 5

    elif word_count < 50:
        score = 7

    elif word_count < 80:
        score = 8

    else:
        score = 9

    question_words = set(question.lower().split())
    answer_words = set(answer.lower().split())

    common_words = question_words.intersection(answer_words)

    ignored_words = {
        "the",
        "is",
        "are",
        "a",
        "an",
        "and",
        "to",
        "of",
        "your",
        "you",
        "what",
        "why",
        "how",
        "tell",
        "me",
        "about",
        "did",
        "do",
        "can",
        "would",
        "was",
        "were"
    }

    useful_common_words = common_words - ignored_words

    if len(useful_common_words) >= 2 and score < 10:
        score += 1

    if score > 10:
        score = 10

    if score <= 3:

        feedback = (
            "Your answer is too short. "
            "Try explaining your answer with more details "
            "and give an example."
        )

    elif score <= 5:

        feedback = (
            "Your answer is a good start. "
            "Add more technical details and examples."
        )

    elif score <= 7:

        feedback = (
            "Good answer. "
            "Try connecting your answer more clearly "
            "to the question and explain your reasoning."
        )

    elif score <= 9:

        feedback = (
            "Very good answer. "
            "You provided useful details related to the question. "
            "You can improve it further with a specific example."
        )

    else:

        feedback = (
            "Excellent answer. "
            "Your response is detailed and relevant. "
            "You explained the topic clearly."
        )

    return {
        "question": question,
        "answer": answer,
        "score": score,
        "feedback": feedback,
        "word_count": word_count
    }