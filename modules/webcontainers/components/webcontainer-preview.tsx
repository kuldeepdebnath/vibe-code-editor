"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { WebContainer } from "@webcontainer/api";

import { Progress } from "@/components/ui/progress";
import TerminalComponent, { type TerminalRef } from "./terminal";
import type { TemplateFolder } from "@/modules/playgrounds/lib/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";

type StartCommand = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
}

const findPackageJsonPath = (
  folder: TemplateFolder,
  currentPath = "",
): string | null => {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const nextPath = currentPath ? `${currentPath}/${item.folderName}` : item.folderName;
      const result = findPackageJsonPath(item, nextPath);
      if (result) return result;
      continue;
    }

    if (item.filename === "package" && item.fileExtension === "json") {
      return currentPath ? `${currentPath}/package.json` : "package.json";
    }
  }

  return null;
};

const routeFilePattern = /(?:^|\/)app(?:\/.*)?\/page\.(?:[cm]?[jt]sx?)$/;
const hasClientDirective = (content: string) =>
  /^\s*["']use client["'];?/m.test(content);

const getClientPageWrapper = (importPath: string) => `import ClientPage from "${importPath}";

export const dynamic = "force-dynamic";

export default function Page() {
  return <ClientPage />;
}
`;

const toGeneratedClientPath = (currentPath: string, clientFileName: string) => {
  const generatedRoot = "vibe-generated";
  return currentPath ? `${generatedRoot}/${currentPath}/${clientFileName}` : `${generatedRoot}/${clientFileName}`;
};

const getRelativeImportPath = (fromDir: string, toFile: string) => {
  const fromParts = fromDir.split("/").filter(Boolean);
  const toParts = toFile.split("/").filter(Boolean);

  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) {
    shared += 1;
  }

  const up = fromParts.length - shared;
  const down = toParts.slice(shared).join("/");
  return `${up > 0 ? `${"../".repeat(up)}` : "./"}${down}`;
};

const rewriteRoutePropNames = (content: string) =>
  content
    .replace(/\bsearchParams\b/g, "routeSearchParams")
    .replace(/\bparams\b/g, "routeParams");

const prepareClientRouteFiles = async (
  instance: WebContainer,
  folder: TemplateFolder,
  currentPath = "",
): Promise<void> => {
  for (const item of folder.items) {
    if ("folderName" in item) {
      const nextPath = currentPath ? `${currentPath}/${item.folderName}` : item.folderName;
      await prepareClientRouteFiles(instance, item, nextPath);
      continue;
    }

    const fileName = `${item.filename}${item.fileExtension ? "." + item.fileExtension : ""}`;
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const isRoutePage = routeFilePattern.test(filePath);

    if (!isRoutePage || !hasClientDirective(item.content)) {
      continue;
    }

    const extIndex = fileName.lastIndexOf(".");
    const baseName = extIndex === -1 ? fileName : fileName.slice(0, extIndex);
    const extension = extIndex === -1 ? "" : fileName.slice(extIndex);
    const clientFileName = `${baseName}.client${extension}`;
    const generatedClientFilePath = toGeneratedClientPath(currentPath, clientFileName);
    const wrapperImportPath = getRelativeImportPath(currentPath, generatedClientFilePath);

    const generatedClientDir = generatedClientFilePath.split("/").slice(0, -1).join("/");

    await instance.fs.mkdir(generatedClientDir || ".", { recursive: true }).catch(() => {});
    await instance.fs.writeFile(generatedClientFilePath, rewriteRoutePropNames(item.content));
    await instance.fs.writeFile(filePath, getClientPageWrapper(wrapperImportPath));
  }
};

const collectStartCommands = (
  scripts: Record<string, string>,
  packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    main?: string;
  },
): StartCommand[] => {
  const hasNext = Boolean(packageJson.dependencies?.next || packageJson.devDependencies?.next);
  const hasVite = Boolean(packageJson.dependencies?.vite || packageJson.devDependencies?.vite);
  const hasReactScripts = Boolean(
    packageJson.dependencies?.["react-scripts"] || packageJson.devDependencies?.["react-scripts"],
  );
  const hasExpress = Boolean(packageJson.dependencies?.express || packageJson.devDependencies?.express);
  const commands: StartCommand[] = [];

  if (hasNext) {
    commands.push({ command: "npm", args: ["exec", "--", "next", "build", "--webpack"] });
    commands.push({ command: "npm", args: ["exec", "--", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"] });
  } else if (scripts.dev) {
    if (hasVite) commands.push({ command: "npm", args: ["run", "dev", "--", "--host", "0.0.0.0"] });
    if (hasReactScripts) commands.push({ command: "npm", args: ["run", "dev"], env: { HOST: "0.0.0.0", BROWSER: "none" } });
    if (hasExpress) commands.push({ command: "npm", args: ["run", "dev"], env: { HOST: "0.0.0.0", PORT: "3000" } });
    commands.push({ command: "npm", args: ["run", "dev"], env: { HOST: "0.0.0.0", PORT: "3000" } });
  }

  if (scripts.start) {
    if (hasReactScripts) commands.push({ command: "npm", args: ["run", "start"], env: { HOST: "0.0.0.0", BROWSER: "none" } });
    if (hasNext) commands.push({ command: "npm", args: ["run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"] });
    commands.push({ command: "npm", args: ["run", "start"], env: { HOST: "0.0.0.0", PORT: "3000" } });
  }

  if (scripts.preview) {
    if (hasVite) commands.push({ command: "npm", args: ["run", "preview", "--", "--host", "0.0.0.0"] });
    commands.push({ command: "npm", args: ["run", "preview"], env: { HOST: "0.0.0.0", PORT: "3000" } });
  }

  if (packageJson.main) {
    commands.push({ command: "npm", args: ["exec", "--", "node", packageJson.main], env: { HOST: "0.0.0.0", PORT: "3000" } });
  }

  return commands;
};

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  templateData,
  error,
  instance,
  isLoading,
  forceResetup = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const terminalRef = useRef<TerminalRef | null>(null);

  useEffect(() => {
    if (forceResetup) {
      setPreviewUrl("");
      setCurrentStep(0);
      setSetupError(null);
      setIsSetupComplete(false);
      setIsSetupInProgress(false);
    }
  }, [forceResetup]);

  useEffect(() => {
    async function setupContainer() {
      if (!instance || isSetupComplete || isSetupInProgress) return;

      try {
        setIsSetupInProgress(true);
        setSetupError(null);

        setCurrentStep(1);
        terminalRef.current?.writeToTerminal?.("Transforming template data...\r\n");
        const files = transformToWebContainerFormat(templateData);

        setCurrentStep(2);
        terminalRef.current?.writeToTerminal?.("Mounting files...\r\n");
        await instance.mount(files);
        terminalRef.current?.writeToTerminal?.("Files mounted successfully\r\n");

        await prepareClientRouteFiles(instance, templateData);
        terminalRef.current?.writeToTerminal?.("Client route files normalized\r\n");

        const packageJsonPath = findPackageJsonPath(templateData);
        if (!packageJsonPath) {
          throw new Error("No package.json found in this project.");
        }

        const packageDirectory = packageJsonPath.includes("/")
          ? packageJsonPath.split("/").slice(0, -1).join("/")
          : ".";

        setCurrentStep(3);
        terminalRef.current?.writeToTerminal?.(`Reading ${packageJsonPath}...\r\n`);
        const packageJsonStr = await instance.fs.readFile(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageJsonStr) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          main?: string;
        };

        const commands = collectStartCommands(packageJson.scripts ?? {}, packageJson);
        if (commands.length === 0) {
          throw new Error("No runnable script found in package.json.");
        }

        const lockfilePath = packageDirectory === "." ? "package-lock.json" : `${packageDirectory}/package-lock.json`;
        const hasLockfile = await instance.fs.readFile(lockfilePath, "utf8").then(() => true).catch(() => false);
        const installArgs = hasLockfile ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"];

        terminalRef.current?.writeToTerminal?.(
          hasLockfile
            ? "Using package-lock.json for install...\r\n"
            : "No package-lock.json found, installing from scratch...\r\n",
        );

        const installProcess = await instance.spawn("npm", installArgs, {
          cwd: packageDirectory === "." ? undefined : packageDirectory,
        });

        await installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminalRef.current?.writeToTerminal?.(data);
            },
          }),
        );

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(`Failed to install dependencies. Exit code: ${installExitCode}`);
        }

        setCurrentStep(4);
        terminalRef.current?.writeToTerminal?.("Starting development server...\r\n");

        let resolved = false;
        const unsubscribe = instance.on("server-ready", (_port: number, url: string) => {
          resolved = true;
          setPreviewUrl(url);
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
          terminalRef.current?.writeToTerminal?.(`Server ready at ${url}\r\n`);
        });

        for (const [index, command] of commands.entries()) {
          terminalRef.current?.writeToTerminal?.(
            `Trying ${command.command} ${command.args.join(" ")}...\r\n`,
          );

          const process = await instance.spawn(command.command, command.args, {
            env: command.env,
            cwd: packageDirectory === "." ? undefined : packageDirectory,
          });

          await process.output.pipeTo(
            new WritableStream({
              write(data) {
                terminalRef.current?.writeToTerminal?.(data);
              },
            }),
          ).catch((pipeError) => {
            console.error("Pipe error:", pipeError);
          });

          const exitCode = await process.exit.catch(() => 1);
          if (resolved) break;

          terminalRef.current?.writeToTerminal?.(
            `Start attempt ${index + 1} failed with code ${exitCode}\r\n`,
          );

          try {
            process.kill();
          } catch {
            // ignore
          }
        }

        unsubscribe();

        if (!resolved) {
          throw new Error("Development server exited unexpectedly with code 1");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error setting up container:", err);
        terminalRef.current?.writeToTerminal?.(`Error: ${message}\r\n`);
        setSetupError(message);
        setIsSetupInProgress(false);
        setIsSetupComplete(false);
        setCurrentStep(0);
      }
    }

    setupContainer();
  }, [instance, isSetupComplete, isSetupInProgress, templateData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (stepIndex === currentStep) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress value={(currentStep / 4) * 100} className="h-2 mb-6" />
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                <span className="text-sm font-medium">Transforming template data</span>
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                <span className="text-sm font-medium">Mounting files</span>
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                <span className="text-sm font-medium">Installing dependencies</span>
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                <span className="text-sm font-medium">Starting development server</span>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <iframe src={previewUrl} className="w-full h-full border-none" title="WebContainer Preview" />
          </div>
          <div className="h-64 border-t">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;
