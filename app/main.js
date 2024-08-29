const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");


const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;

  case "cat-file":
    const flag = process.argv[3];
    const blobSHA = process.argv[4];
    if (flag === "-p") {
      prettyPrintObject(blobSHA);
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;

  case "hash-object":
    const writeFlag = process.argv[3];
    const fileName = process.argv[4];
    if (writeFlag === "-w") {
      hashObject(fileName);
    } else {
      throw new Error(`Unknown flag ${writeFlag}`);
    }
    break;

    case "ls-tree":
      createTree();
      break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function prettyPrintObject(blobSHA) {
  const blobPath = path.join(process.cwd(), ".git", "objects", blobSHA.slice(0, 2), blobSHA.slice(2));
  const blobData = fs.readFileSync(blobPath);
  const decompressedData = zlib.inflateSync(blobData).toString("utf-8");
  const content = decompressedData.split("\0")[1];
  process.stdout.write(content); // No newline at the end
}

function hashObject(fileName) {
  const fileContent = fs.readFileSync(fileName);
  const header = `blob ${fileContent.length}\0`;
  const store = header + fileContent;
  const sha1Hash = crypto.createHash("sha1").update(store).digest("hex");

  const objectPath = path.join(process.cwd(), ".git", "objects", sha1Hash.slice(0, 2));
  if (!fs.existsSync(objectPath)) {
    fs.mkdirSync(objectPath);
  }

  const filePath = path.join(objectPath, sha1Hash.slice(2));
  const compressedData = zlib.deflateSync(store);
  fs.writeFileSync(filePath, compressedData);

  console.log(sha1Hash);
}


function createTree() {
  const flag = process.argv[3];
  if (flag == "--name-only") {
      const sha = process.argv[4];
      const directory = sha.slice(0, 2);
      const fileName = sha.slice(2);
      const filePath = path.join(__dirname, ".git", "objects", directory, fileName);
      let inflatedContent = zlib.inflateSync(fs.readFileSync(filePath)).toString().split('\0');
      let content = inflatedContent.slice(1).filter(value => value.includes(" "));
      let names = content.map(value => value.split(" ")[1]);
      names.forEach((name) => process.stdout.write(`${name}\n`));
  }
}

