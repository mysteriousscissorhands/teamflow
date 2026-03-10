import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API_URL = "https://teamflow-cohu.onrender.com";

function App() {

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = "";

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");

  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {

      const loginResponse = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          username: email,
          password: password
        })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        localStorage.setItem("token", loginData.access_token);
        setToken(loginData.access_token);
        setMessage("");
      }

    } else {
      setMessage(data.detail || "Registration failed");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        username: email,
        password: password
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setMessage("");
    } else {
      setMessage(data.detail || "Login failed");
    }
  };

  const fetchProjects = async () => {

    const response = await fetch(`${API_URL}/projects/`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      setProjects(data);
    }
  };

  const fetchTasks = async (projectId) => {

    if (!projectId) return;

    const response = await fetch(`${API_URL}/tasks/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      setTasks(data);
    }
  };

  const handleCreateProject = async (e) => {

    e.preventDefault();

    const response = await fetch(`${API_URL}/projects/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newProjectName,
        description: newProjectDescription
      })
    });

    if (response.ok) {
      setNewProjectName("");
      setNewProjectDescription("");
      fetchProjects();
    }
  };

  const handleCreateTask = async (e) => {

    e.preventDefault();

    if (!selectedProject) return;

    const response = await fetch(`${API_URL}/tasks/${selectedProject.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: newTaskTitle,
        description: newTaskDescription
      })
    });

    if (response.ok) {
      setNewTaskTitle("");
      setNewTaskDescription("");
      fetchTasks(selectedProject.id);
    }
  };

  const deleteTask = async (taskId) => {

    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.ok && selectedProject) {
      fetchTasks(selectedProject.id);
    }
  };

  const handleDragEnd = async (result) => {

    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;

    await fetch(`${API_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status: newStatus
      })
    });

    if (selectedProject) {
      fetchTasks(selectedProject.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProjects([]);
    setTasks([]);
    setSelectedProject(null);
  };

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  useEffect(() => {
    if (selectedProject) fetchTasks(selectedProject.id);
  }, [selectedProject]);

  if (!token) {

    return (

      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">

        <div className="bg-gray-800 p-10 rounded-lg shadow-lg w-96">

          <h1 className="text-3xl font-bold mb-6 text-center">
            {isRegister ? "Register" : "TeamFlow Login"}
          </h1>

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-700"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-700"
            />

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 p-2 rounded"
            >
              {isRegister ? "Register" : "Login"}
            </button>

          </form>

          <p className="mt-4 text-red-400">{message}</p>

          <p
            className="mt-4 text-blue-400 cursor-pointer"
            onClick={()=>setIsRegister(!isRegister)}
          >
            {isRegister
              ? "Already have an account? Login"
              : "Create new account"}
          </p>

        </div>

      </div>
    );
  }

  const getColumnTitle = (status) => {
    if (status === "todo") return "To Do";
    if (status === "in_progress") return "In Progress";
    if (status === "done") return "Completed";
  };

  return (

    <div className="flex min-h-screen bg-gray-900 text-white">

      <div className="w-64 bg-gray-800 p-6">

        <h1 className="text-2xl font-bold mb-6">
          TeamFlow
        </h1>

        <button
          onClick={handleLogout}
          className="bg-gray-700 hover:bg-gray-600 w-full mb-6 p-2 rounded"
        >
          Logout
        </button>

        <h2 className="text-lg font-semibold mb-3">
          Projects
        </h2>

        <ul className="space-y-2">

          {projects.map((project)=>(
            <li
              key={project.id}
              className="p-2 rounded hover:bg-gray-700 cursor-pointer"
              onClick={()=>setSelectedProject(project)}
            >
              {project.name}
            </li>
          ))}

        </ul>

      </div>

      <div className="flex-1 p-10">

        {!selectedProject ? (

          <>
          <h2 className="text-3xl font-bold mb-6">
            Create Project
          </h2>

          <form onSubmit={handleCreateProject} className="space-y-4 max-w-md">

            <input
              type="text"
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e)=>setNewProjectName(e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800"
            />

            <input
              type="text"
              placeholder="Project Description"
              value={newProjectDescription}
              onChange={(e)=>setNewProjectDescription(e.target.value)}
              className="w-full p-2 rounded bg-gray-800"
            />

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
            >
              Create Project
            </button>

          </form>
          </>

        ) : (

          <>

            <button
              onClick={()=>setSelectedProject(null)}
              className="mb-4 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
            >
              ⬅ Back
            </button>

            <h2 className="text-3xl font-bold mb-6">
              {selectedProject.name}
            </h2>

            <form onSubmit={handleCreateTask} className="mb-6 space-y-3 max-w-md">

              <input
                type="text"
                placeholder="Task Title"
                value={newTaskTitle}
                onChange={(e)=>setNewTaskTitle(e.target.value)}
                required
                className="w-full p-2 rounded bg-gray-800"
              />

              <input
                type="text"
                placeholder="Task Description"
                value={newTaskDescription}
                onChange={(e)=>setNewTaskDescription(e.target.value)}
                className="w-full p-2 rounded bg-gray-800"
              />

              <button
                type="submit"
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
              >
                Create Task
              </button>

            </form>

            <DragDropContext onDragEnd={handleDragEnd}>

              <div className="flex gap-8">

                {["todo","in_progress","done"].map((status)=>(

                  <Droppable key={status} droppableId={status}>

                    {(provided)=>(

                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="w-72 bg-gray-800 rounded-lg p-4 min-h-[300px]"
                      >

                        <h3 className="font-semibold mb-4">
                          {getColumnTitle(status)}
                        </h3>

                        {tasks
                          .filter((task)=>task.status===status)
                          .map((task,index)=>(

                            <Draggable
                              key={task.id}
                              draggableId={task.id.toString()}
                              index={index}
                            >

                              {(provided)=>(

                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-gray-700 p-3 rounded mb-3 shadow"
                                >

                                  <div className="font-semibold">
                                    {task.title}
                                  </div>

                                  <div className="text-sm text-gray-300">
                                    {task.description}
                                  </div>

                                  <button
                                    onClick={()=>deleteTask(task.id)}
                                    className="mt-2 bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-sm"
                                  >
                                    Delete
                                  </button>

                                </div>

                              )}

                            </Draggable>

                          ))}

                        {provided.placeholder}

                      </div>

                    )}

                  </Droppable>

                ))}

              </div>

            </DragDropContext>

          </>
        )}

      </div>

    </div>
  );
}

export default App;