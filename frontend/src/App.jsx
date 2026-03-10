import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API_URL = "https://teamflow-cohu.onrender.com";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- REGISTER ---------------- */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const emailTrimmed = email.trim();
    const usernameTrimmed = username.trim();

    // Client-side validation before hitting the backend
    if (usernameTrimmed.length < 2) {
      setMessage("Username must be at least 2 characters.");
      setLoading(false);
      return;
    }
    if (password.length < 4) {
      setMessage("Password must be at least 4 characters.");
      setLoading(false);
      return;
    }

    const payload = {
      username: usernameTrimmed,
      email: emailTrimmed,       // ✅ email was missing in the original code — caused the 422
      password: password
    };

    console.log("Register payload:", payload);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("Register response:", response.status, data);

      if (response.ok) {
        // Auto-login right after registration
        const loginResponse = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            username: emailTrimmed,   // backend login uses email as the username field
            password: password
          })
        });

        const loginData = await loginResponse.json();
        console.log("Auto-login response:", loginResponse.status, loginData);

        if (loginResponse.ok) {
          localStorage.setItem("token", loginData.access_token);
          setToken(loginData.access_token);
          setMessage("");
        } else {
          // Auto-login failed for some reason — redirect to login with message
          setMessage("Registered! Please log in.");
          setIsRegister(false);
        }
      } else {
        // Parse FastAPI 422 validation errors into a readable message
        if (response.status === 422 && Array.isArray(data.detail)) {
          const errors = data.detail.map((err) => err.msg).join(", ");
          setMessage(`Error: ${errors}`);
        } else {
          setMessage(data.detail || "Registration failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Register error:", err);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- LOGIN ---------------- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: email.trim(),   // backend queries by email
          password: password
        })
      });

      const data = await response.json();
      console.log("Login response:", response.status, data);

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
        setMessage("");
      } else {
        setMessage(data.detail || "Invalid email or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH PROJECTS ---------------- */
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Token expired — force logout
      if (response.status === 401) { handleLogout(); return; }
      const data = await response.json();
      if (response.ok && Array.isArray(data)) setProjects(data);
    } catch (err) {
      console.error("Fetch projects error:", err);
    }
  };

  /* ---------------- FETCH TASKS ---------------- */
  const fetchTasks = async (projectId) => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) setTasks(data);
    } catch (err) {
      console.error("Fetch tasks error:", err);
    }
  };

  /* ---------------- CREATE PROJECT ---------------- */
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newProjectName, description: newProjectDescription })
      });
      if (response.ok) {
        setNewProjectName("");
        setNewProjectDescription("");
        fetchProjects();
      }
    } catch (err) {
      console.error("Create project error:", err);
    }
  };

  /* ---------------- CREATE TASK ---------------- */
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${selectedProject.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDescription })
      });
      if (response.ok) {
        setNewTaskTitle("");
        setNewTaskDescription("");
        fetchTasks(selectedProject.id);
      }
    } catch (err) {
      console.error("Create task error:", err);
    }
  };

  /* ---------------- DELETE TASK ---------------- */
  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok && selectedProject) fetchTasks(selectedProject.id);
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  /* ---------------- DRAG TASK ---------------- */
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (selectedProject) fetchTasks(selectedProject.id);
    } catch (err) {
      console.error("Drag task error:", err);
    }
  };

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProjects([]);
    setTasks([]);
    setSelectedProject(null);
  };

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  useEffect(() => {
    if (selectedProject) fetchTasks(selectedProject.id);
  }, [selectedProject]);

  const getColumnTitle = (status) => {
    if (status === "todo") return "📋 To Do";
    if (status === "in_progress") return "⚡ In Progress";
    if (status === "done") return "✅ Completed";
  };

  const getColumnColor = (status) => {
    if (status === "todo") return "border-slate-500";
    if (status === "in_progress") return "border-amber-500";
    if (status === "done") return "border-emerald-500";
  };

  /* ---------------- LOGIN / REGISTER SCREEN ---------------- */
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-full max-w-sm px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">TeamFlow</h1>
            <p className="text-gray-400 text-sm mt-1">
              {isRegister ? "Create your account" : "Welcome back"}
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">

              {isRegister && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={isRegister}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                />
              </div>

              {message && (
                <p className={`text-sm px-3 py-2 rounded-lg ${
                  message.includes("Registered")
                    ? "bg-emerald-900/40 text-emerald-400"
                    : "bg-red-900/40 text-red-400"
                }`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition duration-200 text-sm mt-2"
              >
                {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-800 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage("");
                  setEmail("");
                  setUsername("");
                  setPassword("");
                }}
                className="text-blue-400 hover:text-blue-300 text-sm bg-transparent p-0 transition"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN DASHBOARD ---------------- */
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">

      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">TeamFlow</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Projects</p>
          <ul className="space-y-1">
            {projects.length === 0 && (
              <li className="text-gray-600 text-sm px-2 py-2">No projects yet</li>
            )}
            {projects.map((project) => (
              <li
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`px-3 py-2 rounded-lg cursor-pointer text-sm transition flex items-center gap-2 ${
                  selectedProject?.id === project.id
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current flex-shrink-0 opacity-60" />
                {project.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!selectedProject ? (
          <div className="flex-1 p-10">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold mb-2">New Project</h2>
              <p className="text-gray-400 text-sm mb-8">Create a project to start organizing your tasks.</p>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Website Redesign"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Description <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="What is this project about?"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
                >
                  Create Project
                </button>
              </form>
            </div>
          </div>

        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-800 flex items-center gap-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-white bg-transparent p-0 transition text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="h-4 w-px bg-gray-700" />
              <h2 className="text-lg font-semibold">{selectedProject.name}</h2>
            </div>

            <div className="px-8 py-5 border-b border-gray-800">
              <form onSubmit={handleCreateTask} className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Task Title</label>
                  <input
                    type="text"
                    placeholder="What needs to be done?"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                  />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Description <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Details..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition whitespace-nowrap"
                >
                  + Add Task
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-x-auto p-8">
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-full min-w-max">
                  {["todo", "in_progress", "done"].map((status) => (
                    <Droppable key={status} droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`w-72 flex flex-col rounded-2xl bg-gray-900 border-t-2 ${getColumnColor(status)} ${
                            snapshot.isDraggingOver ? "bg-gray-800/80" : ""
                          } transition`}
                        >
                          <div className="px-4 py-3 border-b border-gray-800">
                            <h3 className="font-semibold text-sm">{getColumnTitle(status)}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {tasks.filter((t) => t.status === status).length} tasks
                            </p>
                          </div>
                          <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]">
                            {tasks
                              .filter((task) => task.status === status)
                              .map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-gray-800 border border-gray-700 p-3 rounded-xl shadow-sm ${
                                        snapshot.isDragging ? "shadow-lg ring-1 ring-blue-500" : ""
                                      } transition group`}
                                    >
                                      <div className="font-medium text-sm text-white">{task.title}</div>
                                      {task.description && (
                                        <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                                      )}
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="mt-2 text-xs text-red-400 hover:text-red-300 bg-transparent p-0 opacity-0 group-hover:opacity-100 transition"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
