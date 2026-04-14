"use client"
import { useEffect, useRef } from 'react'
import { Editor, Monaco } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "@/modules/playgrounds/lib/editor-config"
import type { TemplateFile } from  "@/modules/playgrounds/lib/path-to-json"

interface PlaygruoundEditorProps {
    activeFile: TemplateFile | undefined
    content: string
    onContentChange: (value: string) => void
}

const PlaygroundEditor = ({
    activeFile,
    content,
    onContentChange
}:PlaygruoundEditorProps) => {
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const handleEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco
        console.log('Editor mounted:', !!editorRef.current)

        editor.updateOptions(defaultEditorOptions as unknown as Parameters<typeof editor.updateOptions>[0]);
        configureMonaco(monaco)


        updateEditorLanguage()
    }

    const updateEditorLanguage = () => {
        if (!activeFile || !monacoRef.current || !editorRef.current) return
        const model = editorRef.current.getModel()
        if (!model) return 

        const language = getEditorLanguage(activeFile.fileExtension || "")
        try {
            monacoRef.current.editor.setModelLanguage(model, language)
        } catch (error) {
            console.warn(`Failed to set editor language to ${language}:`, error)
            
        }
    }


    useEffect(() => {
        updateEditorLanguage()
    }, [activeFile])


  return (
    <div className='h-full relative'>
        <Editor
            height="100%"
            language={activeFile ? getEditorLanguage(activeFile.fileExtension) : 'plaintext'}
            value={content}
            onChange={(value) => onContentChange(value || '')}
            onMount={handleEditorMount}
        />
    </div>
  )
}

export default PlaygroundEditor
