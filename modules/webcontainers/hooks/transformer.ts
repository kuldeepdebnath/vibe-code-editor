import type {
  TemplateFile,
  TemplateFolder as PlaygroundTemplateFolder,
} from "@/modules/playgrounds/lib/path-to-json";

interface WebContainerFile {
  file: {
    contents: string;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;
type TemplateItem = TemplateFile | PlaygroundTemplateFolder;

const isFolder = (item: TemplateItem): item is PlaygroundTemplateFolder =>
  "folderName" in item;

const isFile = (item: TemplateItem): item is TemplateFile =>
  "filename" in item;

const hasPackageJsonAtLevel = (folder: PlaygroundTemplateFolder) =>
  folder.items.some(
    (item) =>
      isFile(item) &&
      item.filename === "package" &&
      item.fileExtension === "json",
  );

const routeFilePattern = /(?:^|\/)app(?:\/.*)?\/(?:page|layout)\.(?:[cm]?[jt]sx?)$/;

const hasClientDirective = (content: string) =>
  /^\s*["']use client["'];?/m.test(content);

const hasRouteProps = (content: string) =>
  /\b(params|searchParams)\b/.test(content);

const rewriteClientRouteComponent = (content: string) => {
  if (!hasClientDirective(content) || !hasRouteProps(content)) {
    return content;
  }

  let nextContent = content;

  if (!/export\s+const\s+dynamic\s*=/.test(nextContent)) {
    nextContent = nextContent.replace(
      /^\s*["']use client["'];?\s*\n?/m,
      (match) => `${match}export const dynamic = "force-dynamic";\n`,
    );
  }

  if (nextContent === content) {
    return content;
  }

  return nextContent;
};

const normalizeTemplateRoot = (
  template: PlaygroundTemplateFolder,
): PlaygroundTemplateFolder => {
  let current = template;

  while (
    !hasPackageJsonAtLevel(current) &&
    current.items.length === 1 &&
    isFolder(current.items[0])
  ) {
    current = current.items[0];
  }

  return current;
};

export function transformToWebContainerFormat(
  template: PlaygroundTemplateFolder
): WebContainerFileSystem {
  const normalizedTemplate = normalizeTemplateRoot(template);

  function processItem(
    item: TemplateItem,
    currentPath = "",
  ): WebContainerFile | WebContainerDirectory {
    if (isFolder(item)) {
      // This is a directory
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach((subItem) => {
        const key = isFile(subItem)
          ? `${subItem.filename}${subItem.fileExtension ? "." + subItem.fileExtension : ""}`
          : subItem.folderName;
        const childPath = currentPath ? `${currentPath}/${key}` : key;
        directoryContents[key] = processItem(subItem, childPath);
      });

      return {
        directory: directoryContents
      };
    } else {
      // This is a file
      const isRouteFile = routeFilePattern.test(currentPath);
      const content = isRouteFile
        ? rewriteClientRouteComponent(item.content)
        : item.content;

      return {
        file: {
          contents: content
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  normalizedTemplate.items.forEach((item) => {
    const key = isFile(item)
          ? `${item.filename}${item.fileExtension ? "." + item.fileExtension : ""}`
      : item.folderName;
    result[key] = processItem(item, key);
  });

  return result;
}
