import { readTemplateStructureFromJson, saveTemplateStructureToJson } from "@/modules/playgrounds/lib/path-to-json";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import fs from "fs/promises";
import path from "path";

function validatejsonStructure(data: unknown): boolean {
    try {
        JSON.parse(JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Invalid JSON structure:", error);
        return false;
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return Response.json({ error: "id is required" }, { status: 400 });
    }

    const playground = await db.playground.findUnique({
        where: { id },
    });

    if (!playground) {
        return Response.json({ error: "playground not found" }, { status: 404 });
    }

    const templatekey = playground.template as keyof typeof templatePaths;
    const templatePath = templatePaths[templatekey];
    if (!templatePath) {
        return Response.json({ error: "template not found" }, { status: 404 });
    }

    try {
        const inputPath = path.join(process.cwd(), templatePath);
        const outputFile = path.join(process.cwd(), `output/${templatekey}.json`);

        await saveTemplateStructureToJson(inputPath, outputFile);

        const result = await readTemplateStructureFromJson(outputFile);
        if (!validatejsonStructure(result.items)) {
            return Response.json({ error: "Invalid JSON structure" }, { status: 500 });
        }

        await fs.unlink(outputFile);
        return Response.json({ success: true, templateJson: result.items }, { status: 200 });
    } catch (error) {
        console.error("Error occurred while processing template:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
