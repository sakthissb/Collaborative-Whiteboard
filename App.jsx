import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState(2);
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState({});
  const [activeDrawer, setActiveDrawer] = useState({});
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    if (!joined) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.on("draw", ({ fromX, fromY, toX, toY, clr, sz, roomId}) => {
      // console.log(roomId, username);
      drawOnCanvas(fromX, fromY, toX, toY, false, clr, sz);
    });

    socket.on("initialDraw", (data) => {
        for (let i = 0; i < data.length; i++) {
          let {fromX, fromY, toX, toY, clr, sz} = data[i];
          drawOnCanvas(fromX, fromY, toX, toY, false, clr, sz);
        }
    })

    socket.on("clear", () => {
      clearCanvas(false);
    });

    socket.on("userDrawing", (data) => {
      setActiveDrawer(data);
    })

    socket.on("userList", (Users) => {
      console.log(Users);
      setUsers(Users);

    });

    // // User Name
    // const name = prompt("Enter Your Name...!");
    // setUsername(name)
    // socket.emit("newUser", {username})

    return () => socket.off("draw");
  }, [joined]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setPrevPos({ x: offsetX, y: offsetY });
    // socket.emit("userDrawing", {x:offsetX, y:offsetY, name: username});
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !prevPos) return;
    const { offsetX, offsetY } = e.nativeEvent;
    drawOnCanvas(prevPos.x, prevPos.y, offsetX, offsetY, true, color, size);
    setPrevPos({ x: offsetX, y: offsetY });
  };

  const drawOnCanvas = (fromX, fromY, toX, toY, emit, clr, sz) => {
    // if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    clr = tool == 'pen'?clr:'white';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = clr;
    ctx.lineWidth = sz;
    ctx.stroke();

    if (emit) {
      socket.emit("draw", { fromX, fromY, toX, toY, clr, sz, roomId});
      socket.emit("userDrawing", {x:fromX, y:fromY, name: username, room:roomId});
    }
  };

  const stopDrawing = (e) => {
    setIsDrawing(false);
    setPrevPos(null);
    setActiveDrawer(null);
    socket.emit("userDrawing", {x:-1, y:-1, name:"", room:roomId});
  };

  const clearCanvas = (emit = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (emit) socket.emit("clear", roomId);
  };  

  const changeTool = () => {
    setTool(tool == "pen" ? "eraser" : "pen");
  };

  if(!joined) {
    return (
      <div>
        UserName : <input 
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        /> 
        <br />
        
        Room : <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button 
          onClick={() => {
            setJoined(true)
            socket.emit("joinRoom", {username, roomId});
          }}
        
        >Join Room</button>
      </div>
    )
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        style={{
          border: "1px solid",
          cursor: tool === "pen" ? "crosshair" : "pointer",
        }}
      />
      <ul>
        <li>
          <button onClick={clearCanvas}>Clear Board</button>
        </li>

        <li>
          <button onClick={changeTool}>{tool}</button>
        </li>

        <li>
          <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </li>

        <li>
          <input 
            type="range"
            value={size}
            min={0}
            max={50}
            onChange={(e) => setSize(e.target.value)}
          />
          <p style={{color:'black'}}>{size}</p>
        </li>
          
      </ul>

        {
          Object.values(users).map((v, i) => (
            <li key={i}>{v}</li>
          ))
        }

        {
          activeDrawer !== null ? (
            <div
              style={{
                position:"absolute",
                zIndex:1,
                left:activeDrawer.x,
                top: activeDrawer.y,
                color: "black",
                fontWeight:"bold",
                fontSize:"15px",
              }}
            
            > ✏️{activeDrawer.name}</div>
          ):
          <div></div>
        }
    </>
  );
}

export default App;
