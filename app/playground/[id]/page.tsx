"use client";
import { useEffect, useState, useCallback ,useRef} from "react";
import { useParams } from "next/navigation";
import { usePlayground } from "@/modules/playgrounds/hooks/usePlayground";
import type { TemplateFile, TemplateFolder } from "@/modules/playgrounds/lib/path-to-json";
import { findFilePath } from "@/modules/playgrounds/lib";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TemplateFileTree } from "@/modules/playgrounds/components/playground-explorer";
import { useFileExplorer } from "@/modules/playgrounds/hooks/useFileExplorer";
import { Button } from "@/vibecode-starters/vite-shadcn/src/components/ui/button";
import { AlertCircle, Bot, FileText, Save, Settings, X, FolderOpen } from "lucide-react";
import { LoadingStep } from "@/modules/playgrounds/components/loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/vibecode-starters/vite-shadcn/src/components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/vibecode-starters/vite-shadcn/src/components/ui/tabs";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/vibecode-starters/vite-shadcn/src/components/ui/resizable";
import PlaygroundEditor from "@/modules/playgrounds/components/playground-editor";
import { ResizableHandle } from "@/components/ui/resizable";
import WebContainerPreview from "@/modules/webcontainers/components/webcontainer-preview";
import { useWebContainer } from "@/modules/webcontainers/hooks/useWebConatiners";

const preferredExtensions = new Set(["js", "jsx", "ts", "tsx", "mjs", "cjs"]);

const collectFiles = (folder: TemplateFolder, files: TemplateFile[] = []): TemplateFile[] => {
  for (const item of folder.items) {
    if ("folderName" in item) {
      collectFiles(item, files);
    } else {
      files.push(item);
    }
  }

  return files;
};

const findInitialFile = (folder: TemplateFolder): TemplateFile | null => {
  const files = collectFiles(folder);

  const preferredIndex = files.find(
    (file) =>
      file.filename === "index" &&
      (file.fileExtension === "js" ||
        file.fileExtension === "jsx" ||
        file.fileExtension === "ts" ||
        file.fileExtension === "tsx")
  );
  if (preferredIndex) return preferredIndex;

  const preferredCodeFile = files.find((file) => preferredExtensions.has(file.fileExtension));
  if (preferredCodeFile) return preferredCodeFile;

  return files[0] ?? null;
};

const MainPlaygroundPage = () => {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const { playgroundData, templateData, saveTemplateData, error, isLoading } = usePlayground(id);

  const {
    activeFileId,
    closeAllFiles,
    closeFile,
    templateData: explorerTemplateData,
    openFiles,
    openFile,
    setActiveFileId,
    setPlaygroundId,
    setTemplateData,
    updateFileContent,
    setOpenFiles,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
  } = useFileExplorer();

  
  const {
    serverUrl,
    isLoading: containerLoading,
    error: containerError,
    instance,
    writeFileSync,
  } = useWebContainer({ templateData });


  
  const lastSyncedContent = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setPlaygroundId(id);
    setIsPreviewVisible(false);
  }, [id, setPlaygroundId]);

  useEffect(() => {
    if (templateData && !explorerTemplateData) {
      setTemplateData(templateData);
    }
  }, [templateData, explorerTemplateData, setTemplateData]);

  useEffect(() => {
    if (!templateData || !explorerTemplateData || openFiles.length > 0) {
      return;
    }

    const initialFile = findInitialFile(explorerTemplateData);
    if (initialFile) {
      openFile(initialFile);
    }
  }, [templateData, explorerTemplateData, openFiles.length, openFile]);

  // create wrapper functions that pass saveTemplateData
  const WrappedHandleAddFile = useCallback((newFile: TemplateFile, parentPath: string) => {
    handleAddFile(newFile, parentPath, writeFileSync, instance!, saveTemplateData);
  }, [handleAddFile, writeFileSync, instance, saveTemplateData]);

  const WrappedHandleAddFolder = useCallback((newFolder: TemplateFolder, parentPath: string) => {
    handleAddFolder(newFolder, parentPath, instance!, saveTemplateData);
  }, [handleAddFolder, instance, saveTemplateData]);

  const WrappedHandleDeleteFile = useCallback((file: TemplateFile, parentPath: string) => {
    handleDeleteFile(file, parentPath, saveTemplateData);
  }, [handleDeleteFile, saveTemplateData]);

  const WrappedHandleDeleteFolder = useCallback((folder: TemplateFolder, parentPath: string) => {
    handleDeleteFolder(folder, parentPath, saveTemplateData);
  }, [handleDeleteFolder, saveTemplateData]);

  const WrappedHandleRenameFile = useCallback((file: TemplateFile, newFilename: string, newExtension: string, parentPath: string) => {
    handleRenameFile(file, newFilename, newExtension, parentPath, saveTemplateData);
  }, [handleRenameFile, saveTemplateData]);

  const WrappedHandleRenameFolder = useCallback((folder: TemplateFolder, newFolderName: string, parentPath: string) => {
    handleRenameFolder(folder, newFolderName, parentPath, saveTemplateData);
  }, [handleRenameFolder, saveTemplateData]); 



  const activeFile = openFiles.find((file) => file.id === activeFileId) || null;
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const handleEditorContentChange = (value: string) => {
    if (!activeFile) return;

    updateFileContent(activeFile.id, value);
    void writeFileSync(activeFile.id, value).catch((error) => {
      console.error("Failed to sync file to WebContainer:", error);
    });
  };

    const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  const handleSave = useCallback(
    async (fileIdOrEvent?: string | React.MouseEvent | KeyboardEvent) => {
      const fileId = typeof fileIdOrEvent === "string" ? fileIdOrEvent : undefined;
      const targetFileId = fileId || activeFileId;
      if (!targetFileId) return;

      const fileToSave = openFiles.find((f) => f.id === targetFileId);
      if (!fileToSave) return;

      const latestTemplateData = useFileExplorer.getState().templateData;
      if (!latestTemplateData) return;

      try {
        const filePath = findFilePath(fileToSave, latestTemplateData);
        if (!filePath) {
          toast.error(
            `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`
          );
          return;
        }

        // Update file content in template data (clone for immutability)
        const updatedTemplateData = JSON.parse(
          JSON.stringify(latestTemplateData)
        );
        const updateItemsContent = (items: any[]): any[] =>
          items.map((item) => {
            if ("folderName" in item) {
              return { ...item, items: updateItemsContent(item.items) };
            } else if (
              item.filename === fileToSave.filename &&
              item.fileExtension === fileToSave.fileExtension
            ) {
              return { ...item, content: fileToSave.content };
            }
            return item;
          });
        updatedTemplateData.items = updateItemsContent(
          updatedTemplateData.items
        );

        // Sync with WebContainer
        if (writeFileSync) {
          await writeFileSync(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
          if (instance && instance.fs) {
            await instance.fs.writeFile(filePath, fileToSave.content);
          }
        }

        // Use saveTemplateData to persist changes
        await saveTemplateData(updatedTemplateData);
        setTemplateData(updatedTemplateData);

        // Update open files
        const updatedOpenFiles = openFiles.map((f) =>
          f.id === targetFileId
            ? {
                ...f,
                content: fileToSave.content,
                originalContent: fileToSave.content,
                hasUnsavedChanges: false,
              }
            : f
        );
        setOpenFiles(updatedOpenFiles);

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error(
          `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
        throw error;
      }
    },
    [
      activeFileId,
      openFiles,
      writeFileSync,
      instance,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ]
  );

  const handleSaveAll = async () => {
    const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges);

    if (unsavedFiles.length === 0) {
      toast.info("No unsaved changes");
      return;
    }

    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      toast.error("Failed to save some files");
    }
  };

  // Add event to save file by click ctrl + s
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if(error){
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem0] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4"/>
        <h2 className="text-xl font-semibold mb-2">Failed to load playground</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>

      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <div className="mb-8">
            <LoadingStep
              currentStep={1}
              step={1}
              label="Loading playground data"
            />
            <LoadingStep
              currentStep={2}
              step={2}
              label="Setting up environment"
            />
            <LoadingStep currentStep={3} step={3} label="Ready to code" />
          </div>
        </div>
      </div>
    );
  }

    // No template data
  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <FolderOpen className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-amber-600 mb-2">
          No template data available
        </h2>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Template
        </Button>
      </div>
    );
  }


  return (
    <TooltipProvider>
      <>
        <div className="flex min-h-screen w-full overflow-x-hidden">
          {templateData ? (
            <TemplateFileTree
              data={templateData}
              onFileSelect={openFile}
              selectedFile={activeFile || undefined}
              title="File Explorer"
              onAddFile={WrappedHandleAddFile}
              onAddFolder={WrappedHandleAddFolder}
              onDeleteFile={WrappedHandleDeleteFile}
              onDeleteFolder={WrappedHandleDeleteFolder}
              onRenameFile={WrappedHandleRenameFile}
              onRenameFolder={WrappedHandleRenameFolder}
            />
          ) : null}
          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex flex-1 items-center gap-2">
                <div className="flex flex-col flex-1">
                  <h1 className="text-2xl font-bold">
                    {playgroundData?.title || "Code playground"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {openFiles.length} Files(s) Open
                    {hasUnsavedChanges && " - Unsaved Changes"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave()}
                        disabled={!activeFile || !activeFile.hasUnsavedChanges}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save (Ctrl+S)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges}
                      >
                        <Save className="h-4 w-4" /> All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                  </Tooltip>
                  <Button variant="default" size="icon">
                    <Bot className="size-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                      >
                        {isPreviewVisible ? "Hide" : "Show"} Preview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={closeAllFiles}>
                        Close All Files
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            <div className="h-[calc(100vh-4rem)]">
              {openFiles.length > 0 ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="shrink-0 border-b bg-muted/30">
                    <Tabs
                      value={activeFileId || ""}
                      onValueChange={setActiveFileId}
                    >
                      <div className="flex items-center justify-between px-4 py-2">
                        <TabsList className="h-8 bg-transparent p-0">
                          {openFiles.map((file) => (
                            <TabsTrigger
                              key={file.id}
                              value={file.id}
                              className="group relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                <span>
                                  {file.filename}.{file.fileExtension}
                                </span>
                                {file.hasUnsavedChanges && (
                                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                                )}
                                <span
                                  className="ml-2 flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeFile(file.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </span>
                              </div>
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {openFiles.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={closeAllFiles}
                            className="h-6 px-2 text-xs"
                          >
                            Close All
                          </Button>
                        )}
                      </div>
                    </Tabs>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full"
                    >
                      <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                        <PlaygroundEditor
                          activeFile={activeFile ?? undefined}
                          content={activeFile?.content || ""}
                          onContentChange={(value)=>{
                            activeFileId && updateFileContent(activeFileId,value)  
                          }}
                        />
                      </ResizablePanel>

                      {isPreviewVisible && (
                        <>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={50}>
                            {templateData && (
                              <WebContainerPreview
                                templateData={
                                  templateData as NonNullable<typeof templateData>
                                }
                                instance={instance}
                                writeFileSync={writeFileSync}
                                isLoading={containerLoading}
                                error={containerError}
                                serverUrl={serverUrl || ""}
                                forceResetup={false}
                              />
                            )}
                          </ResizablePanel>
                        </>
                      )}
                    </ResizablePanelGroup>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-md rounded-xl border bg-background/90 p-6 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold">
                      {playgroundData?.title || "Code playground"}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No file is open right now. Pick a file from the explorer
                      on the left to start editing it here.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <span>{openFiles.length} files open</span>
                      <span>•</span>
                      <span>
                        {hasUnsavedChanges ? "Unsaved changes" : "All saved"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
