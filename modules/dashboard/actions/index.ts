"use server";
import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { revalidatePath } from "next/cache";


export const toggleStarMarked = async(playgroundId:string, isChecked:boolean) =>{
    const user = await currentUser();
    const userId = user?.id;

    if(!userId){
        return { success:false, error:"User not authenticated", isMarked:!isChecked };
    }

    try {
        if(isChecked){
            await db.starMark.create({
                data:{
                    userId,
                    playgroundId,
                    isMarked:isChecked,
                }
            })
        } else {
            await db.starMark.delete({
                where:{
                    userId_playgroundId:{
                        userId,
                        playgroundId,
                    }
                }
            })
        }

        revalidatePath("/dashboard")
        return { success:true, error:null, isMarked:isChecked };
    } catch (error) {
        console.log("Error toggling star marked", error);
        return { success:false, error:"Failed to toggle star marked", isMarked:!isChecked };
    }
}


export const getAllPlaygroundForUser =async ()=>{
    const user = await currentUser();

    try {
        const playground = await db.playground.findMany({
            where:{
                userId:user?.id
            },
            include:{
                user:true,
                StarMarks:{
                    where:{
                        userId:user?.id
                    },
                    select:{
                        isMarked:true  
                    }
                },
            }
        });

        return playground;

    } catch {
        
    }
}


export const createPlayground = async(data:{
    title:string;
    template: "REACT" | "VUE" | "ANGULAR" | "NEXTJS" | "EXPRESS" | "HONO";
    description?:string;
})=>{
    const user = await currentUser();

    const {template , title , description} =data;

    try {
        const playground = await db.playground.create({
            data:{
                title:title,
                description:description,
                template:template,
                userId:user!.id!

            }
        })
        return playground
    } catch (error) {
        console.log(error)
    }
}

export const deleteprojectById =async(id:string)=>{
    try {
        await db.playground.delete({
            where:{
                id
            }
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}



export const editProjectById = async(id:string, data:{title:string , description:string})=>{
    try {
        await db.playground.update({
            where:{
                id
            },
            data:data
        })
        revalidatePath("/dashboard")

    } catch (error) {
        console.log(error)
    }
}


export const duplicateProjectByid = async(id:string) =>{
    try{
        const originalPlayground = await db.playground.findUnique({
            where:{id},
            // todo: add template files
        })
        if(!originalPlayground){
            throw new Error("Original playground not found");
        }

        const duplicatedPlayground = await db.playground.create({
            data:{
                title:`${originalPlayground.title} (Copy)`,
                description:originalPlayground.description,
                template:originalPlayground.template,
                userId:originalPlayground.userId

                // todo: add template files
            }
        })


        revalidatePath("/dashboard")
        return duplicatedPlayground;
    }catch(error){
        console.log("Error duplicatig project",error);
    }
}

