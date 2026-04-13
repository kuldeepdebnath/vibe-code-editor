"use client"
import React from 'react'
import {
  useParams

} from 'next/navigation';
import { usePlayground } from '@/modules/playgrounds/hooks/usePlayground';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { TemplateFileTree } from '@/modules/playgrounds/components/playground-explorer';
const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();
  const { playgroundData,
    templateData,
    isLoading,
    error,
    loadplayground,
    saveTemplateData } = usePlayground(id);

    console.log("playgroundData:", playgroundData);
    console.log("templateData:", templateData);

    const activeFile = "sample.txt" // Placeholder for active file state

  return (
    <TooltipProvider>
      <>
      <TemplateFileTree
        data={templateData!}
          onFileSelect={() => {}}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={() => {}}
          onAddFolder={() => {}}
          onDeleteFile={() => {}}
          onDeleteFolder={() => {}}
          onRenameFile={() => {}}
          onRenameFolder={() => {} }
      />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1'/>
          <Separator orientation='vertical' className='mr-2 h-4' />
        </header>
        <div className='flex flex-1 items-center gap-2'>
          <div className='flex flex-col flex-1'>
            <h1 className='text-2xl font-bold'>{playgroundData?.title || "Code playground"}</h1>
          </div>
        </div>
      </SidebarInset>
      </>
    </TooltipProvider>
  )
}

export default MainPlaygroundPage
