import { useState } from "react";

function App() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [resume, setResume] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [listening, setListening] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Select resume
  function handleFile(event) {
    setResume(event.target.files[0]);
    setUploadMessage("");
  }

  // Upload resume
  async function uploadResume() {
    if (!resume) {
      setUploadMessage("Please select a resume first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", resume);

      const response = await fetch(
        "http://localhost:8000/upload-resume",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setUploadMessage(data.detail || "Resume upload failed.");
        return;
      }

      setUploadMessage(
        data.message + ": " + data.filename
      );
    } catch (error) {
      console.error(error);
      setUploadMessage(
        "Cannot connect to backend. Make sure Docker backend is running."
      );
    }
  }

  // Generate interview questions
  async function generateQuestions(event) {
    if (event) {
      event.preventDefault();
    }

    setLoadingQuestions(true);

    try {
      const response = await fetch(
        "http://localhost:8000/generate-questions",
        {
          method: "GET",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || data.error || "Failed to generate questions.");
        return;
      }

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setAnswers({});
        setResults({});
      } else {
        alert("No questions were generated.");
      }
    } catch (error) {
      console.error("Generate questions error:", error);

      alert(
        "Cannot connect to backend. Make sure ai-interview-backend is running."
      );
    } finally {
      setLoadingQuestions(false);
    }
  }

  // Store answer
  function handleAnswer(index, value) {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [index]: value,
    }));
  }

  // Voice answer
  function startRecording(index) {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported. Please use Google Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(index);

    recognition.start();

    recognition.onresult = (event) => {
      const speechText =
        event.results[0][0].transcript;

      setAnswers((previousAnswers) => ({
        ...previousAnswers,
        [index]: speechText,
      }));
    };

    recognition.onend = () => {
      setListening(null);
    };

    recognition.onerror = (event) => {
      console.log(
        "Speech recognition error:",
        event.error
      );

      setListening(null);
    };
  }

  // Submit answer
  async function submitAnswer(index) {
    const answer = answers[index] || "";
    const question = questions[index];

    if (!answer.trim()) {
      alert("Please enter or speak an answer first.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/evaluate-answer?question=${encodeURIComponent(
          question
        )}&answer=${encodeURIComponent(answer)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Evaluation failed.");
        return;
      }

      setResults((previousResults) => ({
        ...previousResults,
        [index]: data,
      }));
    } catch (error) {
      console.error(error);
      alert("Cannot connect to backend.");
    }
  }

  // Dashboard calculations
  const scores = Object.values(results).map(
    (result) => result.score
  );

  const questionsAnswered = scores.length;

  const totalScore = scores.reduce(
    (total, score) => total + score,
    0
  );

  const averageScore =
    questionsAnswered > 0
      ? (totalScore / questionsAnswered).toFixed(1)
      : 0;

  const performancePercentage =
    questionsAnswered > 0
      ? Math.round((averageScore / 10) * 100)
      : 0;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            AI Interview Coach
          </h1>

          <p style={styles.subtitle}>
            Practice your interview and improve your
            answers.
          </p>
        </div>

        {/* Resume Section */}
        <div style={styles.card}>
          <h2>📄 Upload Resume</h2>

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFile}
            style={styles.fileInput}
          />

          <br />
          <br />

          <button
            type="button"
            onClick={uploadResume}
            style={styles.primaryButton}
          >
            Upload Resume
          </button>

          {uploadMessage && (
            <p style={styles.success}>
              {uploadMessage}
            </p>
          )}
        </div>

        {/* Interview Section */}
        <div style={styles.card}>
          <h2>🎯 Interview Questions</h2>

          <button
            type="button"
            onClick={generateQuestions}
            style={styles.primaryButton}
            disabled={loadingQuestions}
          >
            {loadingQuestions
              ? "Generating Questions..."
              : "Generate Interview Questions"}
          </button>

          {questions.length === 0 && (
            <p style={styles.info}>
              Upload your resume first, then click the
              button above to generate personalized
              interview questions.
            </p>
          )}

          {/* Questions */}
          {questions.map((question, index) => (
            <div
              key={index}
              style={styles.questionCard}
            >
              <h3>
                {index + 1}. {question}
              </h3>

              {/* Answer */}
              <textarea
                rows="6"
                placeholder="Type your answer here..."
                value={answers[index] || ""}
                onChange={(event) =>
                  handleAnswer(
                    index,
                    event.target.value
                  )
                }
                style={styles.textarea}
              />

              <div style={styles.buttonRow}>

                {/* Voice Button */}
                <button
                  type="button"
                  onClick={() =>
                    startRecording(index)
                  }
                  style={styles.voiceButton}
                >
                  {listening === index
                    ? "🎤 Listening..."
                    : "🎤 Answer by Voice"}
                </button>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={() =>
                    submitAnswer(index)
                  }
                  style={styles.submitButton}
                >
                  Submit Answer
                </button>

              </div>

              {/* Evaluation */}
              {results[index] && (
                <div style={styles.resultBox}>

                  <h4>
                    Score:{" "}
                    <span style={styles.scoreText}>
                      {results[index].score}/10
                    </span>
                  </h4>

                  <p>
                    <strong>Feedback:</strong>{" "}
                    {results[index].feedback}
                  </p>

                  <p>
                    <strong>Word Count:</strong>{" "}
                    {results[index].word_count}
                  </p>

                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dashboard */}
        <div style={styles.dashboard}>

          <h2>📊 Performance Dashboard</h2>

          <div style={styles.statsContainer}>

            <div style={styles.statCard}>
              <h3>Questions Answered</h3>
              <p style={styles.statNumber}>
                {questionsAnswered}
              </p>
            </div>

            <div style={styles.statCard}>
              <h3>Average Score</h3>
              <p style={styles.statNumber}>
                {averageScore}/10
              </p>
            </div>

            <div style={styles.statCard}>
              <h3>Performance</h3>
              <p style={styles.statNumber}>
                {performancePercentage}%
              </p>
            </div>

          </div>

          <h3>Overall Performance</h3>

          <div style={styles.progressBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${performancePercentage}%`,
              }}
            >
              {performancePercentage}%
            </div>
          </div>

          <h3>Question Scores</h3>

          {scores.length === 0 && (
            <p style={styles.info}>
              Answer some questions to see your
              performance.
            </p>
          )}

          {scores.map((score, index) => (
            <div
              key={index}
              style={styles.scoreContainer}
            >
              <div style={styles.scoreLabel}>
                <span>
                  Question {index + 1}
                </span>

                <strong>
                  {score}/10
                </strong>
              </div>

              <div
                style={styles.smallProgressBackground}
              >
                <div
                  style={{
                    ...styles.smallProgressBar,
                    width: `${score * 10}%`,
                  }}
                />
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
}


/* =========================
   STYLES
========================= */

const styles = {

  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f8",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "1000px",
    margin: "auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "25px",
  },

  title: {
    fontSize: "42px",
    marginBottom: "10px",
  },

  subtitle: {
    fontSize: "18px",
    color: "#666",
  },

  card: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  },

  dashboard: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "30px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  },

  fileInput: {
    padding: "8px",
  },

  primaryButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "7px",
    backgroundColor: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: "15px",
  },

  voiceButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "7px",
    backgroundColor: "#7c3aed",
    color: "white",
    cursor: "pointer",
  },

  submitButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "7px",
    backgroundColor: "#16a34a",
    color: "white",
    cursor: "pointer",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  questionCard: {
    marginTop: "20px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#fafafa",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    borderRadius: "7px",
    border: "1px solid #ccc",
    fontSize: "15px",
    resize: "vertical",
  },

  resultBox: {
    marginTop: "15px",
    padding: "15px",
    borderRadius: "8px",
    backgroundColor: "#eef6ff",
  },

  scoreText: {
    fontSize: "22px",
  },

  success: {
    color: "#15803d",
    fontWeight: "bold",
  },

  info: {
    color: "#666",
    marginTop: "15px",
  },

  statsContainer: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  statCard: {
    flex: "1",
    minWidth: "180px",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#f4f6f8",
    textAlign: "center",
  },

  statNumber: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "10px 0",
  },

  progressBackground: {
    width: "100%",
    height: "30px",
    backgroundColor: "#e5e7eb",
    borderRadius: "15px",
    overflow: "hidden",
    marginBottom: "25px",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    transition: "width 0.5s",
  },

  scoreContainer: {
    marginBottom: "15px",
  },

  scoreLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "5px",
  },

  smallProgressBackground: {
    width: "100%",
    height: "12px",
    backgroundColor: "#e5e7eb",
    borderRadius: "6px",
    overflow: "hidden",
  },

  smallProgressBar: {
    height: "100%",
    backgroundColor: "#16a34a",
    transition: "width 0.5s",
  },
};

export default App;