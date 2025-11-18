"use client"

import { useRef, useEffect, useState } from "react"
import { Bold, Italic, Underline, List, ListOrdered, Link, Image, Youtube, Code } from "lucide-react"
import { YouTubeDialog } from "./youtube-dialog"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className = "" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [htmlValue, setHtmlValue] = useState(value)
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false)

  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      // Only update if content is different to avoid cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || ""
      }
    }
  }, [value, isHtmlMode])

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    updateContent()
  }

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt("הזן קישור:")
    if (url) {
      formatText("createLink", url)
    }
  }

  const insertImage = () => {
    const url = prompt("הזן כתובת תמונה:")
    if (url) {
      formatText("insertImage", url)
    }
  }

  const insertYouTube = () => {
    setYoutubeDialogOpen(true)
  }

  const handleYouTubeInsert = (iframe: string) => {
    if (editorRef.current) {
      document.execCommand("insertHTML", false, iframe)
      updateContent()
    }
  }

  const changeFormat = (format: string) => {
    formatText("formatBlock", format)
  }

  const toggleHTMLMode = () => {
    if (isHtmlMode) {
      // Switch back to visual mode
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlValue
        onChange(htmlValue)
      }
    } else {
      // Switch to HTML mode
      if (editorRef.current) {
        setHtmlValue(editorRef.current.innerHTML)
      }
    }
    setIsHtmlMode(!isHtmlMode)
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-2 bg-gray-50 flex-wrap">
        {!isHtmlMode && (
          <>
            <select
              className="text-sm border rounded px-2 py-1 bg-white text-gray-600"
              onChange={(e) => changeFormat(e.target.value)}
              defaultValue="p"
            >
              <option value="p">פסקה</option>
              <option value="h1">כותרת 1</option>
              <option value="h2">כותרת 2</option>
              <option value="h3">כותרת 3</option>
            </select>

            <div className="h-4 w-px bg-gray-300"></div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={() => formatText("bold")}
                title="מודגש"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={() => formatText("italic")}
                title="נטוי"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={() => formatText("underline")}
                title="קו תחתון"
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-gray-300"></div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={() => formatText("insertUnorderedList")}
                title="רשימה"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={() => formatText("insertOrderedList")}
                title="רשימה ממוספרת"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-gray-300"></div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={insertLink}
                title="קישור"
              >
                <Link className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={insertImage}
                title="תמונה"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                onClick={insertYouTube}
                title="הטמעת יוטיוב"
              >
                <Youtube className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-gray-300"></div>
          </>
        )}

        <button
          type="button"
          className={`p-1.5 hover:bg-gray-200 rounded transition-colors ${isHtmlMode ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          onClick={toggleHTMLMode}
          title="מצב HTML"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      {isHtmlMode ? (
        <textarea
          className="w-full p-4 font-mono text-sm focus:outline-none min-h-[200px] resize-y"
          value={htmlValue}
          onChange={(e) => setHtmlValue(e.target.value)}
          dir="ltr"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          className="w-full p-4 focus:outline-none min-h-[200px] prose prose-sm max-w-none"
          onInput={updateContent}
          onBlur={updateContent}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          style={{
            direction: "rtl",
          }}
        />
      )}

      <style jsx>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>

      {/* YouTube Dialog */}
      <YouTubeDialog
        open={youtubeDialogOpen}
        onOpenChange={setYoutubeDialogOpen}
        onInsert={handleYouTubeInsert}
      />
    </div>
  )
}

