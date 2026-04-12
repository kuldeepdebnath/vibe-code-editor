"use client"
import React from 'react'
import {
  useParams

} from 'next/navigation';
import { usePlayground } from '@/modules/playgrounds/hooks/usePlayground';
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
  return (
    <div>
      Params : {id}
    </div>
  )
}

export default MainPlaygroundPage
