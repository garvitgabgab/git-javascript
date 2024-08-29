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
    const catFlag = process.argv[3];
    const catHash = process.argv[4];
    if (catFlag === "-p") {
      printBlob(catHash);
    } else {
      throw new Error(`Unknown flag ${catFlag}`);
    }
    break;

  case "hash-object":
    const hashFlag = process.argv[3];
    const fileName = process.argv[4];
    if (hashFlag === "-w") {
      hashObject(fileName);
    } else {
      throw new Error(`Unknown flag ${hashFlag}`);
    }
    break;

  case "ls-tree":
    listTree(process.argv[3]);
    break;

  case "write-tree":
    writeTree();
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  mkdirSync(join(process.cwd(), ".git"), { recursive: true });
  mkdirSync(join(process.cwd(), ".git", "objects"), { recursive: true });
  mkdirSync(join(process.cwd(), ".git", "refs"), { recursive: true });
  writeFileSync(join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function readObject(hash) {
  const filePath = join(process.cwd(), ".git", "objects", hash.slice(0, 2), hash.slice(2));
  const rawData = readFileSync(filePath);
  const data = inflateSync(rawData);
  return data.toString();
}

function writeObject(hash, content) {
  const dir = join(process.cwd(), ".git", "objects", hash.slice(0, 2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, hash.slice(2)), deflateSync(content));
}

function hashObject(filePath) {
  const fileData = readFileSync(filePath);
  const header = `blob ${fileData.length}\0`;
  const content = Buffer.concat([Buffer.from(header), fileData]);
  const hash = createHash("sha1").update(content).digest("hex");
  writeObject(hash, content);
  console.log(hash);
}

function printBlob(hash) {
  if (!hash) throw new Error("Missing hash");
  const content = readObject(hash).split("\0")[1];
  process.stdout.write(content);
}

function listTree(treeHash) {
  if (!treeHash) throw new Error("Missing tree hash");
  const treeData = readObject(treeHash);
  const entries = [...treeData.matchAll(/(\d+) (.*?)\0(.{20})/g)];
  entries.forEach(([, , name]) => console.log(name));
}

function writeTree() {
  const rootHash = writeTreeForPath(".");
  process.stdout.write(rootHash);
}

function writeTreeForPath(dirPath) {
  const entries = readdirSync(dirPath).filter(name => name !== ".git").map(name => {
    const fullPath = join(dirPath, name);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      const treeHash = writeTreeForPath(fullPath);
      return [`040000`, name, treeHash];
    } else if (stats.isFile()) {
      const blobHash = hashObject(fullPath);
      const mode = (stats.mode & 0o111) ? "100755" : "100644";
      return [mode, name, blobHash];
    }

    return [];
  });

  const entryBuffers = entries.map(([mode, name, hash]) => 
    Buffer.concat([Buffer.from(`${mode} ${name}\0`), Buffer.from(hash, "hex")])
  );
  const treeData = Buffer.concat(entryBuffers);
  const header = Buffer.from(`tree ${treeData.length}\0`);
  const tree = Buffer.concat([header, treeData]);
  const hash = createHash("sha1").update(tree).digest("hex");

  writeObject(hash, tree);
  return hash;
}
