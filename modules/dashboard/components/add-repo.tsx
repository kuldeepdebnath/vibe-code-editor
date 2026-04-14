"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlaygroundFromGithubRepo } from "@/modules/dashboard/actions";
import { ArrowDown, Download, FolderGit2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const AddRepo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [branch, setBranch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const resetForm = () => {
    setRepoUrl("");
    setProjectName("");
    setBranch("");
  };

  const handleClose = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm();
    }

    setIsModalOpen(open);
  };

  const handleSubmit = async () => {
    const trimmedRepoUrl = repoUrl.trim();

    if (!trimmedRepoUrl) {
      toast.error("Please paste a GitHub repository URL.");
      return;
    }

    setIsSubmitting(true);

    try {
      const playground = await createPlaygroundFromGithubRepo({
        repoUrl: trimmedRepoUrl,
        title: projectName.trim() || undefined,
        branch: branch.trim() || undefined,
      });

      if (!playground) {
        toast.error("Failed to import repository.");
        return;
      }

      toast.success("GitHub repository imported successfully!");
      resetForm();
      setIsModalOpen(false);
      router.push(`/playground/${playground.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import repository.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardClassName =
    "group flex w-full flex-row items-center justify-between rounded-lg border bg-muted px-6 py-6 text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#E93F3F] hover:bg-background hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={cardClassName}
      >
        <div className="flex flex-row items-start justify-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-white transition-colors duration-300 group-hover:border-[#E93F3F] group-hover:bg-[#fff8f8] group-hover:text-[#E93F3F]">
            <ArrowDown
              size={30}
              className="transition-transform duration-300 group-hover:translate-y-1"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">
              Open Github Repository
            </h1>
            <p className="max-w-[220px] text-sm text-muted-foreground">
              Import a public repo and edit it in the playground
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src="/github.svg"
            alt="Open GitHub repository"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </button>

      <Dialog open={isModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-[#e93f3f]">
              <FolderGit2 className="h-5 w-5" />
              Import GitHub Repository
            </DialogTitle>
            <DialogDescription>
              Paste a GitHub repo URL and we&apos;ll create a new playground
              from its files.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/vercel/next.js"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="My imported project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              Public repositories work best. Large binary files are skipped so
              the code editor stays fast.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#E93F3F] text-white hover:bg-[#d03636]"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Repository
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddRepo;
