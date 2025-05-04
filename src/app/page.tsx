"use client";

import { v4 as uuidv4 } from "uuid";
import React, { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo, Redo } from "lucide-react";
import {
  Plus,
  Minus,
  Square,
  Circle,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Palette,
  Layers,
  Move,
  X,
  Pen,
  Eraser,
  Save,
  Layout,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";

// Types
type Point = { x: number; y: number };
type DrawingMode = "pen" | "eraser" | "rectangle" | "circle" | "move";
type Layer = {
  id: string;
  name: string;
  visible: boolean;
  content: string;
  zIndex: number;
};

const objectToMove = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
};

// Main Component
export default function DrawingApp() {
  // Canvas State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [brushPattern, setBrushPattern] = useState("standard");
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  // History State for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // move
  const [mode, setMode] = useState("pen");
  const [dragging, setDragging] = useState(false); // To track if dragging is happening
  const [draggedObject, setDraggedObject] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null); // The object being dragged

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layers State
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [layers, setLayers] = useState([
    {
      id: "layer-1",
      name: "Background",
      visible: true,
      zIndex: 0,
      content: "",
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState("layer-1");

  const handleAddLayer = () => {
    const newLayerId = uuidv4();
    const newLayer = {
      id: newLayerId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      zIndex: layers.length,
      content: "",
    };

    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayerId);
  };

  // Rename layer
  const renameLayer = (id: string, newName: string) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === id ? { ...layer, name: newName } : layer
      )
    );
  };

  // Switch active layer
  const switchActiveLayer = (id: string) => {
    setActiveLayerId(id);

    const layer = layers.find((l) => l.id === id);
    if (layer && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx && layer.content) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = layer.content;
      }
    }
  };
  // Toggle layer visibility
  const toggleLayerVisibility = (layerId: string) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  // Delete layer
  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return; // Prevent deleting the last layer

    const newLayers = layers.filter((layer) => layer.id !== id);
    setLayers(newLayers);

    if (id === activeLayerId) {
      const newActiveLayer = newLayers[0]?.id;
      setActiveLayerId(newActiveLayer);

      // Load content of the new active layer (if available)
      if (newActiveLayer && canvasRef.current && newLayers[0]?.content) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = newLayers[0].content;
        }
      }
    }
  };

  // Animation States
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Custom Color Palette
  const [customColors, setCustomColors] = useState<string[]>([
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#f28b82",
    "#fbbc04",
    "#fff475",
    "#ccff90",
    "#a7ffeb",
    "#cbf0f8",
    "#aecbfa",
    "#d7aefb",
    "#fdcfe8",
    "#e6c9a8",
    "#e8eaed",
    "#9aa0a6",
  ]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const parentDiv = canvas.parentElement;

        if (parentDiv) {
          const rect = parentDiv.getBoundingClientRect();

          // Save current canvas content
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          tempCtx?.drawImage(canvas, 0, 0);

          // Resize canvas
          canvas.width = rect.width;
          canvas.height = rect.height - 2; // Subtract 2px for border

          // Restore content
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(tempCanvas, 0, 0);

          // Add to history if needed
          saveToHistory();
        }
      }
    };

    window.addEventListener("resize", handleResize);
    // Initial sizing
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      // Set initial canvas state in history
      if (history.length === 0) {
        const initialState = canvas.toDataURL();
        setHistory([initialState]);
        setHistoryIndex(0);

        // Set initial layer content
        setLayers((prevLayers) =>
          prevLayers.map((layer) =>
            layer.id === "layer-1" ? { ...layer, content: initialState } : layer
          )
        );
      }
    }
  }, [history.length]);

  // Save current state to history
  const saveToHistory = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const currentState = canvas.toDataURL();

      // If we're not at the end of history, trim it
      const newHistory = history.slice(0, historyIndex + 1);

      // Add current state and update index
      setHistory([...newHistory, currentState]);
      setHistoryIndex(newHistory.length);

      // Update active layer content
      setLayers((prevLayers) =>
        prevLayers.map((layer) =>
          layer.id === activeLayerId
            ? { ...layer, content: currentState }
            : layer
        )
      );
    }
  };

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);

      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const img = new Image();
        img.onload = () => {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0);

          // Update active layer
          setLayers((prevLayers) =>
            prevLayers.map((layer) =>
              layer.id === activeLayerId
                ? { ...layer, content: history[newIndex] }
                : layer
            )
          );
        };
        img.src = history[newIndex];
      }
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);

      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const img = new Image();
        img.onload = () => {
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(img, 0, 0);

          // Update active layer
          setLayers((prevLayers) =>
            prevLayers.map((layer) =>
              layer.id === activeLayerId
                ? { ...layer, content: history[newIndex] }
                : layer
            )
          );
        };
        img.src = history[newIndex];
      }
    }
  };

  // Handle mouse down
  // Update draggedObject initialization if necessary
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        setIsDrawing(true);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (mode === "move") {
          if (!draggedObject) {
            // Initialize draggedObject (can be handled in useEffect as well)
            setDraggedObject({
              x: 100, // Example initial x position
              y: 100, // Example initial y position
              width: 50, // Example object width
              height: 50, // Example object height
            });
          }

          // Only set dragging if within bounds of the dragged object
          if (
            draggedObject &&
            x >= draggedObject.x &&
            x <= draggedObject.x + draggedObject.width &&
            y >= draggedObject.y &&
            y <= draggedObject.y + draggedObject.height
          ) {
            setDragging(true); // Start dragging the object
          }
        }

        // For pen and eraser
        if (mode === "pen" || mode === "eraser") {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
          ctx.lineWidth = brushSize;
        }

        // For shape mode
        if (mode === "rectangle" || mode === "circle") {
          setStartPoint({ x, y });
        }
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDrawing && (mode === "pen" || mode === "eraser")) {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (mode === "rectangle" || mode === "circle") {
        if (startPoint) {
          if (historyIndex >= 0) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              ctx.strokeStyle = color;
              ctx.lineWidth = brushSize;
              ctx.beginPath();

              if (mode === "rectangle") {
                ctx.rect(
                  startPoint.x,
                  startPoint.y,
                  x - startPoint.x,
                  y - startPoint.y
                );
              } else if (mode === "circle") {
                const radius = Math.sqrt(
                  Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
                );
                ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
              }

              ctx.stroke();
            };
            img.src = history[historyIndex];
          }
        }
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPoint(null);
      saveToHistory();
    }
    if (dragging) {
      setDragging(false);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPoint(null);
      saveToHistory();
    }
    if (dragging) {
      setDragging(false);
    }
  };

  // Clear canvas
  const handleClearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      }
    }
  };

  // Download canvas as image
  const handleDownload = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "drawing.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Add color to palette
  const addColorToPalette = (newColor: string) => {
    if (!customColors.includes(newColor)) {
      setCustomColors([...customColors, newColor]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 120, damping: 30 },
            }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 100, damping: 25 },
              }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-br from-white via-indigo-50 to-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
            >
              <h2 className="text-3xl font-semibold mb-4 text-indigo-800 text-center">
                Welcome to ArtFlow
              </h2>
              <p className="mb-6 text-gray-700 text-center">
                Unleash your creativity with our pro drawing tools. Select a
                brush, pick a color, and start crafting your masterpiece!
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  {
                    icon: <Pen className="w-5 h-5 text-indigo-600" />,
                    text: "Draw freehand with customizable brushes",
                  },
                  {
                    icon: <Square className="w-5 h-5 text-indigo-600" />,
                    text: "Create perfect shapes instantly",
                  },
                  {
                    icon: <Layers className="w-5 h-5 text-indigo-600" />,
                    text: "Organize your work with layers",
                  },
                  {
                    icon: <Download className="w-5 h-5 text-indigo-600" />,
                    text: "Export your artwork as an image",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: {
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 150,
                        damping: 30,
                      },
                    }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex items-center p-3 bg-white border border-indigo-100 rounded-lg shadow-sm space-x-3"
                  >
                    <div className="p-2 bg-indigo-100 rounded-full">
                      {item.icon}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">
                      {item.text}
                    </span>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                onClick={() => setShowWelcome(false)}
              >
                Start Drawing
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-3 p-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 group">
            <div className="p-2 bg-indigo-100 rounded-full shadow-sm transition-transform duration-300 group-hover:rotate-6">
              <Palette className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 drop-shadow-md tracking-tight">
              ArtFlow
            </h1>
          </div>
          <div className="flex space-x-3 sm:space-x-2">
            <motion.button
              whileHover={{
                scale: 1.08,
                boxShadow: "0px 4px 20px rgba(99, 102, 241, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg transition-all duration-300 whitespace-nowrap flex items-center gap-1"
              onClick={handleDownload}
              title="Save your artwork as an image"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 text-white group-hover:animate-pulse" />
              <span className="text-[10px] sm:text-sm leading-tight">
                Save as Image
              </span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden ">
        {/* Tools Sidebar */}
        <AnimatePresence>
          {!isPanelCollapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "250px", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-r border-gray-200 flex flex-col scrollbar-thin scrollbar-thumb-gray-300 "
            >
              {/* Drawing Tools */}
              <div className="p-2">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1 ">
                  Drawing Tools
                </h2>
                <div className="grid grid-cols-4grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 sm:p-3 rounded flex flex-col items-center justify-center text-xs sm:text-base ${
                      mode === "pen"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setMode("pen")}
                    title="Pen Tool"
                  >
                    <Pen className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span>Pen</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 sm:p-3 rounded flex flex-col items-center justify-center text-xs sm:text-base ${
                      mode === "eraser"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setMode("eraser")}
                    title="Eraser Tool"
                  >
                    <Eraser className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span>Eraser</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 sm:p-3 rounded flex flex-col items-center justify-center text-xs sm:text-base ${
                      mode === "rectangle"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setMode("rectangle")}
                    title="Rectangle Tool"
                  >
                    <Square className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span>Rectangle</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 sm:p-3 rounded flex flex-col items-center justify-center text-xs sm:text-base ${
                      mode === "circle"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setMode("circle")}
                    title="Circle Tool"
                  >
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />
                    <span>Circle</span>
                  </motion.button>
                </div>
              </div>

              {/* Brush Size */}
              <div className="p-3 sm:p-4 border-t border-gray-200">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Brush Size
                </h2>
                <div className="flex items-center justify-between mb-2 space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 rounded-full bg-red-100 hover:bg-gray-200 text-red-700"
                    onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                    aria-label="Decrease brush size"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 rounded-full bg-green-100 hover:bg-gray-200 text-green-500"
                    onClick={() => setBrushSize(Math.min(50, brushSize + 1))}
                    aria-label="Increase brush size"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Color Picker */}
              <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Color
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    aria-label="Toggle color picker"
                  >
                    {showColorPicker ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>

                <div className="flex items-center mb-3 space-x-3">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  ></div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 cursor-pointer"
                    aria-label="Select color"
                  />
                </div>

                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {customColors.map((colorItem, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-8 h-8 rounded-full border border-gray-300"
                            style={{ backgroundColor: colorItem }}
                            onClick={() => setColor(colorItem)}
                            aria-label={`Select custom color ${colorItem}`}
                          ></motion.button>
                        ))}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white"
                          onClick={() => addColorToPalette(color)}
                          aria-label="Add current color to palette"
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Layers */}
              <div className="p-3 sm:p-4 flex-1 overflow-hidden flex flex-col border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Layers
                  </h2>
                  <div className="flex space-x-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded hover:bg-gray-200"
                      onClick={handleAddLayer}
                      aria-label="Add layer"
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded hover:bg-gray-200"
                      onClick={() => setShowLayersPanel(!showLayersPanel)}
                      aria-label="Toggle layers panel"
                    >
                      {showLayersPanel ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Layer List */}
                {showLayersPanel && (
                  <div className="space-y-2 overflow-auto scrollbar-thin scrollbar-thumb-gray-300">
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        className={`p-2 rounded border cursor-pointer select-none ${
                          activeLayerId === layer.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        } flex items-center justify-between`}
                        onClick={() => switchActiveLayer(layer.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            switchActiveLayer(layer.id);
                          }
                        }}
                        aria-pressed={activeLayerId === layer.id}
                        aria-label={`Select layer ${layer.name}`}
                      >
                        <div className="flex items-center">
                          <button
                            className="mr-2 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                            aria-label={`${
                              layer.visible ? "Hide" : "Show"
                            } layer ${layer.name}`}
                          >
                            {layer.visible ? (
                              <Eye className="w-4 h-4 text-gray-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <span className="truncate max-w-[120px] text-gray-600">
                            {layer.name}
                          </span>
                        </div>
                        <button
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          disabled={layers.length <= 1}
                          aria-label={`Delete layer ${layer.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Button Controls */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Controls
                  </h3>
                  <div className="flex items-center justify-between space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="flex items-center bg-gray-100 hover:bg-gray-200 text-sm text-blue-900 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
                      title="Undo last action"
                    >
                      <Undo className="w-4 h-4 mr-1" />
                      <span>Undo</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-sm text-blue-900 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Redo last undone action"
                    >
                      <Redo className="w-4 h-4" />
                      <span>Redo</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearCanvas}
                      className="flex items-center space-x-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-sm text-red-700 rounded shadow"
                      title="Clear the entire canvas"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full border-2 border-gray-200"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          ></canvas>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white shadow-sm border-t border-gray-200 py-1">
        <div className="container mx-auto px-4 text-center text-gray-500 text-xs sm:text-sm">
          &copy; 2025 ArtFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
