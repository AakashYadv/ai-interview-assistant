import React, { useState, useEffect, useRef } from 'react';
import { Upload, User, Clock, Send, Search, Filter, ArrowLeft, FileText, Phone, Mail, Award } from 'lucide-react';

// Mock AI API functions (replace with actual API calls)
const mockExtractResumeData = (file) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate resume extraction with some random missing data
      const mockData = {
        name: Math.random() > 0.3 ? "John Doe" : "",
        email: Math.random() > 0.2 ? "john.doe@email.com" : "",
        phone: Math.random() > 0.5 ? "+1-234-567-8900" : ""
      };
      resolve(mockData);
    }, 2000);
  });
};

const mockGenerateQuestion = (difficulty, questionNumber) => {
  const questions = {
    easy: [
      "What is the difference between let, const, and var in JavaScript?",
      "Explain what React hooks are and name a few commonly used ones."
    ],
    medium: [
      "How would you optimize a React application for better performance?",
      "Explain the event loop in Node.js and how it handles asynchronous operations."
    ],
    hard: [
      "Design a scalable architecture for a real-time chat application using React and Node.js.",
      "Implement a custom hook for debouncing API calls in React with proper cleanup."
    ]
  };
  
  return questions[difficulty][questionNumber % 2];
};

const mockScoreAnswer = (question, answer) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const score = Math.floor(Math.random() * 10) + 1;
      resolve({ score, feedback: `Answer scored ${score}/10. ${score > 7 ? 'Great job!' : 'Could be improved.'}` });
    }, 1000);
  });
};

const mockGenerateFinalSummary = (candidate) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const totalScore = candidate.answers.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = Math.round(totalScore / candidate.answers.length);
      resolve({
        finalScore: avgScore,
        summary: `Candidate demonstrated ${avgScore > 7 ? 'strong' : avgScore > 5 ? 'moderate' : 'basic'} understanding of full-stack development concepts. ${avgScore > 7 ? 'Recommended for next round.' : 'Needs improvement in technical fundamentals.'}`
      });
    }, 1500);
  });
};

// Timer component
const Timer = ({ timeLeft, totalTime, onTimeUp }) => {
  const percentage = (timeLeft / totalTime) * 100;
  
  useEffect(() => {
    if (timeLeft === 0) {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Clock className="w-4 h-4" />
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${
            percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-mono">{timeLeft}s</span>
    </div>
  );
};

// Welcome Back Modal
const WelcomeBackModal = ({ candidate, onContinue, onStartOver }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Welcome Back!</h2>
        <p className="text-gray-600 mb-4">
          We found an incomplete interview for {candidate.name}. 
          You were on question {candidate.answers.length + 1} of 6.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onContinue}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Continue Interview
          </button>
          <button 
            onClick={onStartOver}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};

const AIInterviewApp = () => {
  // Main state
  const [activeTab, setActiveTab] = useState('interviewee');
  const [candidates, setCandidates] = useState([]);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  
  // Interviewee state
  const [step, setStep] = useState('upload'); // upload, collect-info, interview, completed
  const [resumeFile, setResumeFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [collectingField, setCollectingField] = useState(null);
  const [inputValue, setInputValue] = useState('');
  
  // Interview state
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isScoring, setIsScoring] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  
  // Interviewer state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  
  const timerRef = useRef(null);
  
  // Load data from localStorage on mount
  useEffect(() => {
    const savedCandidates = JSON.parse(localStorage.getItem('interviewCandidates') || '[]');
    setCandidates(savedCandidates);
    
    const savedCurrentCandidate = JSON.parse(localStorage.getItem('currentCandidate') || 'null');
    if (savedCurrentCandidate && !savedCurrentCandidate.completed) {
      setCurrentCandidate(savedCurrentCandidate);
      setShowWelcomeBack(true);
    }
  }, []);
  
  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('interviewCandidates', JSON.stringify(candidates));
  }, [candidates]);
  
  useEffect(() => {
    if (currentCandidate) {
      localStorage.setItem('currentCandidate', JSON.stringify(currentCandidate));
    }
  }, [currentCandidate]);
  
  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && step === 'interview') {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, step]);
  
  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      alert('Please upload a PDF or DOCX file');
      return;
    }
    
    setResumeFile(file);
    setExtracting(true);
    
    try {
      const extractedData = await mockExtractResumeData(file);
      setCandidateInfo(extractedData);
      
      const missing = [];
      if (!extractedData.name) missing.push('name');
      if (!extractedData.email) missing.push('email');
      if (!extractedData.phone) missing.push('phone');
      
      setMissingFields(missing);
      
      if (missing.length > 0) {
        setStep('collect-info');
        setCollectingField(missing[0]);
      } else {
        startInterview(extractedData);
      }
    } catch (error) {
      alert('Error extracting resume data');
    } finally {
      setExtracting(false);
    }
  };
  
  // Collect missing information
  const handleCollectInfo = () => {
    if (!inputValue.trim()) return;
    
    const updatedInfo = { ...candidateInfo, [collectingField]: inputValue.trim() };
    setCandidateInfo(updatedInfo);
    setInputValue('');
    
    const remainingFields = missingFields.filter(field => field !== collectingField);
    setMissingFields(remainingFields);
    
    if (remainingFields.length > 0) {
      setCollectingField(remainingFields[0]);
    } else {
      startInterview(updatedInfo);
    }
  };
  
  // Start interview
  const startInterview = (info) => {
    const interviewQuestions = [
      { difficulty: 'easy', timeLimit: 20 },
      { difficulty: 'easy', timeLimit: 20 },
      { difficulty: 'medium', timeLimit: 60 },
      { difficulty: 'medium', timeLimit: 60 },
      { difficulty: 'hard', timeLimit: 120 },
      { difficulty: 'hard', timeLimit: 120 }
    ].map((q, i) => ({
      ...q,
      question: mockGenerateQuestion(q.difficulty, i),
      id: i + 1
    }));
    
    setQuestions(interviewQuestions);
    setCurrentQuestionIndex(0);
    setTimeLeft(interviewQuestions[0].timeLimit);
    setStep('interview');
    setAnswers([]);
    
    const candidate = {
      id: Date.now(),
      ...info,
      startTime: new Date().toISOString(),
      questions: interviewQuestions,
      answers: [],
      completed: false
    };
    
    setCurrentCandidate(candidate);
  };
  
  // Submit answer
  const submitAnswer = async () => {
    if (currentQuestionIndex >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    setIsScoring(true);
    
    try {
      const result = await mockScoreAnswer(currentQuestion.question, answer);
      const answerData = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answer: answer || '(No answer provided)',
        score: result.score,
        feedback: result.feedback,
        timeSpent: currentQuestion.timeLimit - timeLeft
      };
      
      const newAnswers = [...answers, answerData];
      setAnswers(newAnswers);
      
      const updatedCandidate = {
        ...currentCandidate,
        answers: newAnswers
      };
      setCurrentCandidate(updatedCandidate);
      
      // Move to next question or finish
      if (currentQuestionIndex + 1 < questions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeLeft(questions[currentQuestionIndex + 1].timeLimit);
        setAnswer('');
      } else {
        // Interview complete
        await finishInterview(updatedCandidate);
      }
    } catch (error) {
      alert('Error scoring answer');
    } finally {
      setIsScoring(false);
    }
  };
  
  // Finish interview
  const finishInterview = async (candidate) => {
    try {
      const summary = await mockGenerateFinalSummary(candidate);
      const completedCandidate = {
        ...candidate,
        ...summary,
        completed: true,
        endTime: new Date().toISOString()
      };
      
      setCandidates(prev => [...prev.filter(c => c.id !== candidate.id), completedCandidate]);
      setCurrentCandidate(completedCandidate);
      setInterviewComplete(true);
      setStep('completed');
      
      localStorage.removeItem('currentCandidate');
    } catch (error) {
      alert('Error generating final summary');
    }
  };
  
  // Handle welcome back modal
  const handleContinueInterview = () => {
    setShowWelcomeBack(false);
    setCandidateInfo(currentCandidate);
    setAnswers(currentCandidate.answers);
    setQuestions(currentCandidate.questions);
    setCurrentQuestionIndex(currentCandidate.answers.length);
    setTimeLeft(currentCandidate.questions[currentCandidate.answers.length].timeLimit);
    setStep('interview');
  };
  
  const handleStartOver = () => {
    setShowWelcomeBack(false);
    setCurrentCandidate(null);
    localStorage.removeItem('currentCandidate');
    resetInterviewee();
  };
  
  // Reset interviewee state
  const resetInterviewee = () => {
    setStep('upload');
    setResumeFile(null);
    setCandidateInfo({});
    setMissingFields([]);
    setCollectingField(null);
    setInputValue('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setTimeLeft(0);
    setAnswer('');
    setAnswers([]);
    setInterviewComplete(false);
    setCurrentCandidate(null);
  };
  
  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(candidate => 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score') return (b.finalScore || 0) - (a.finalScore || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime);
    });
  
  const getFieldLabel = (field) => {
    const labels = {
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number'
    };
    return labels[field] || field;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {showWelcomeBack && currentCandidate && (
        <WelcomeBackModal
          candidate={currentCandidate}
          onContinue={handleContinueInterview}
          onStartOver={handleStartOver}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">AI Interview Assistant</h1>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('interviewee')}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === 'interviewee'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Interviewee
              </button>
              <button
                onClick={() => setActiveTab('interviewer')}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === 'interviewer'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Interviewer Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-4">
        {/* Interviewee Tab */}
        {activeTab === 'interviewee' && (
          <div className="max-w-2xl mx-auto">
            {step === 'upload' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6 text-center">Upload Your Resume</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg mb-4">Upload your resume to start the interview</p>
                  <p className="text-sm text-gray-600 mb-4">Supported formats: PDF, DOCX</p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                    disabled={extracting}
                  />
                  <label
                    htmlFor="resume-upload"
                    className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                      extracting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {extracting ? 'Processing...' : 'Choose File'}
                  </label>
                  {resumeFile && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: {resumeFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {step === 'collect-info' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Complete Your Information</h2>
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    We need some additional information to proceed with your interview.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-900 mb-3">
                      Please provide your {getFieldLabel(collectingField)}:
                    </p>
                    <div className="flex gap-3">
                      <input
                        type={collectingField === 'email' ? 'email' : 'text'}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Enter your ${getFieldLabel(collectingField).toLowerCase()}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleCollectInfo()}
                      />
                      <button
                        onClick={handleCollectInfo}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {missingFields.length - 1} more field(s) needed
                </div>
              </div>
            )}
            
            {step === 'interview' && questions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </h2>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      questions[currentQuestionIndex].difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      questions[currentQuestionIndex].difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {questions[currentQuestionIndex].difficulty.toUpperCase()}
                    </span>
                  </div>
                  
                  <Timer
                    timeLeft={timeLeft}
                    totalTime={questions[currentQuestionIndex].timeLimit}
                    onTimeUp={submitAnswer}
                  />
                </div>
                
                <div className="mb-6">
                  <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p className="font-medium text-gray-900">
                      {questions[currentQuestionIndex].question}
                    </p>
                  </div>
                  
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isScoring}
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={submitAnswer}
                    disabled={isScoring}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isScoring ? 'Scoring...' : 'Submit Answer'}
                    {!isScoring && <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            
            {step === 'completed' && (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="mb-6">
                  <Award className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Complete!</h2>
                  <p className="text-gray-600">Thank you for completing the interview.</p>
                </div>
                
                {currentCandidate && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Your Results</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {currentCandidate.finalScore}/10
                    </div>
                    <p className="text-gray-600 mb-4">{currentCandidate.summary}</p>
                    <button
                      onClick={resetInterviewee}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Take Another Interview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Interviewer Dashboard */}
        {activeTab === 'interviewer' && (
          <div>
            {!selectedCandidate ? (
              <>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Candidate Dashboard</h2>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search candidates..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="score">Sort by Score</option>
                        <option value="name">Sort by Name</option>
                        <option value="date">Sort by Date</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4">
                    {filteredCandidates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No candidates found. Complete some interviews to see results here.
                      </div>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 rounded-full p-2">
                                <User className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                                <p className="text-sm text-gray-600">{candidate.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600 mb-1">
                                {candidate.finalScore || 'N/A'}/10
                              </div>
                              <p className="text-xs text-gray-500">
                                {candidate.completed ? 'Completed' : 'In Progress'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Selected Candidate View */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Candidate Details - {selectedCandidate.name}</h2>
                  <button 
                    onClick={() => setSelectedCandidate(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to List
                  </button>
                </div>
                
                {/* Candidate Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedCandidate.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedCandidate.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedCandidate.phone || 'N/A'}</p>
                    <p><span className="font-medium">Interview Date:</span> {new Date(selectedCandidate.endTime || selectedCandidate.startTime).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Final Score */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Final Assessment</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{selectedCandidate.finalScore || 'N/A'}/10</div>
                  <p className="text-gray-700">{selectedCandidate.summary}</p>
                </div>
                
                {/* Answers */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Interview Answers</h3>
                  {selectedCandidate.answers.map((ans, index) => (
                    <div key={index} className="p-4 bg-white border rounded-lg shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ans.score >= 8 ? 'bg-green-100 text-green-800' :
                          ans.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ans.score}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 italic">Question: {ans.question}</p>
                      <p className="mb-2">Answer: {ans.answer}</p>
                      <p className="text-sm text-gray-500">Time spent: {ans.timeSpent}s</p>
                      <p className="mt-2 text-sm text-gray-700">{ans.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInterviewApp;
