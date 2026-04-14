import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { TemplateFolder } from "../lib/path-to-json";
import { SaveupdatedCode, getPlaygroundById } from "../actions";

interface PlaygroundData {
    id: string;
    title?: string;
    templateFiles?: { content: unknown }[];
}


interface UsePlaygroundReturn {
    playgroundData: PlaygroundData | null;
    templateData: TemplateFolder | null;
    isLoading: boolean;
    error: string | null;
    loadplayground: () => Promise<void>;
    saveTemplateData: (data: TemplateFolder) => Promise<void>;
}

export const usePlayground = (id: string): UsePlaygroundReturn => {
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
    const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadplayground = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);

            const data = await getPlaygroundById(id);

            if (!data) {
                throw new Error("Failed to load playground");
            }

            setPlaygroundData(data);
            const rawContent = data?.templateFiles?.[0]?.content;

            if (typeof rawContent === "string") {
                try {
                    const parsedContent = JSON.parse(rawContent);
                    setTemplateData(parsedContent);
                    toast.success("playground loaded successfully")
                    return;
                } catch (parseError) {
                    console.warn("Saved playground content is not valid JSON; falling back to template data.", parseError);
                }
            }

            // load template from api if not in saved content
            const res = await fetch(`/api/template/${id}`);
            if (!res.ok) {
                const fallbackText = await res.text();
                throw new Error(`Failed to load template: ${res.status} ${fallbackText.slice(0, 120)}`);
            }

            const responseText = await res.text();
            const templateRes = JSON.parse(responseText);

            if (templateRes?.templateJson && Array.isArray(templateRes.templateJson)) {
                setTemplateData({
                    folderName: "Root",
                    items: templateRes.templateJson,
                });
            } else {
                setTemplateData(templateRes.templateJson || {
                    folderName: "Root",
                    items: [],
                });
            }
            toast.success("playground loaded successfully")

        } catch (error) {
            console.log("Error loading playground:", error);
            setError("Failed to load playground data");
            toast.error("Failed to load playground data");
        }
        finally {
            setIsLoading(false);
        }
    }, [id]);

    const saveTemplateData = useCallback(async (data: TemplateFolder) => {
        try {
            await SaveupdatedCode(id, data);
            setTemplateData(data);
            toast.success("playground saved successfully")
            
        } catch (error) {
            console.log("Error saving Template Data:", error);
            toast.error("Failed to save playground data");
            throw error; // re-throw the error to allow further handling if needed
        }
    }, [id]);

    useEffect(() => {
        loadplayground();
    }, [loadplayground]);   
    return {
        playgroundData,
        templateData,
        isLoading,
        error,
        loadplayground,
        saveTemplateData
    };
};
