const { createHash } = require("crypto");
const { mkdirSync, writeFileSync, readFileSync, statSync, readdirSync } = require("fs");
const { join } = require("path");
const { inflateSync, deflateSync } = require("zlib");

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;

  case "cat-file":
    const flag = process.argv[3];
    const blobSHA = process.argv[4];
    if (flag === "-p") {
      printBlob(blobSHA);
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;

  case "hash-object":
    const writeFlag = process.argv[3];
    const fileName = process.argv[4];
    if (writeFlag === "-w") {
      saveBlob(fileName);
    } else {
      throw new Error(`Unknown flag ${writeFlag}`);
    }
    break;

  case "ls-tree":
    const lsFlag = process.argv[3];
    const treeSHA = process.argv[4];
    if (lsFlag === "--name-only") {
      listTree(treeSHA);
    } else {
      throw new Error(`Unknown flag ${lsFlag}`);
    }
    break;

  case "write-tree":
    writeTree();
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  mkdirSync(join(__dirname, ".git"), { recursive: true });
  mkdirSync(join(__dirname, ".git", "objects"), { recursive: true });
  mkdirSync(join(__dirname, ".git", "refs"), { recursive: true });

  writeFileSync(join(__dirname, ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function readObject(hash) {
  const rawData = readFileSync(join(__dirname, ".git", "objects", hash.slice(0, 2), hash.slice(2)));
  const data = inflateSync(rawData);
  return data.toString();
}

function writeObject(hash, content) {
  const dir = join(__dirname, ".git", "objects", hash.slice(0, 2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, hash.slice(2)), deflateSync(content));
}

function printBlob(blobSHA) {
  const content = readObject(blobSHA).split("\x00")[1];
  process.stdout.write(content);
}

function saveBlob(filePath) {
  if (!filePath) {
    throw new Error("Missing filename");
  }
  const fileData = readFileSync(filePath);
  const data = `blob ${statSync(filePath).size}\x00${fileData}`;
  const hash = createHash("sha1").update(data).digest("hex");
  writeObject(hash, data);
  process.stdout.write(hash);
}

function listTree(treeSHA) {
  if (!treeSHA) {
    throw new Error("Missing hash");
  }
  const content = readObject(treeSHA).split("\x00").slice(1).join("\x00");
  const entries = [...content.matchAll(/(\d+) (.*?)\0(.{20})/g)];
  console.log(entries.map(([, , name]) => name).join("\n"));
}

function writeTree() {
  const hash = writeTreeForPath(".");
  process.stdout.write(hash);
}

function writeTreeForPath(directory) {
  const dirContent = readdirSync(directory);
  const entries = dirContent
    .filter((name) => name !== ".git" && name !== "main.js")
    .map((name) => {
      const fullPath = join(directory, name);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        return ["040000", name, writeTreeForPath(fullPath)];
      } else if (stat.isFile()) {
        return ["100644", name, saveFileAsBlob(fullPath)];
      }
      return ["", "", ""];
    })
    .sort((a, b) => a[1].localeCompare(b[1]))
    .reduce((acc, [mode, name, hash]) => {
      return Buffer.concat([acc, Buffer.from(`${mode} ${name}\x00`), Buffer.from(hash, "hex")]);
    }, Buffer.alloc(0));
  
  const tree = Buffer.concat([Buffer.from(`tree ${entries.length}\x00`), entries]);
  const hash = createHash("sha1").update(tree).digest("hex");
  writeObject(hash, tree);
  return hash;
}

function saveFileAsBlob(file) {
  const data = `blob ${statSync(file).size}\x00${readFileSync(file)}`;
  const hash = createHash("sha1").update(data).digest("hex");
  writeObject(hash, data);
  return hash;
}
