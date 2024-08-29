const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

// Uncomment this block to pass the first stage
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
    const filePath = process.argv[4];
    if (writeFlag === "-w") {
      hashObject(filePath);
    } else {
      throw new Error(`Unknown flag ${writeFlag}`);
    }
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

  // Read the blob file in binary format
  const compressedData = fs.readFileSync(blobPath);

  // Decompress the blob object
  const decompressedData = zlib.inflateSync(compressedData);

  // Convert the decompressed data to a string
  const decompressedStr = decompressedData.toString("utf-8");

  // Extract the actual content by removing the header (e.g., "blob 11\0")
  const content = decompressedStr.slice(decompressedStr.indexOf("\0") + 1);

  // Print the content without an additional newline
  process.stdout.write(content);
}

function hashObject(filePath) {
  // Read the content of the file
  const content = fs.readFileSync(filePath);

  // Create the blob object header: "blob <size>\0"
  const header = `blob ${content.length}\0`;

  // Concatenate the header and the content
  const store = Buffer.concat([Buffer.from(header), content]);

  // Compute the SHA-1 hash of the combined header and content
  const sha1 = crypto.createHash("sha1").update(store).digest("hex");

  // Compress the blob object using zlib
  const compressedStore = zlib.deflateSync(store);

  // Create the path where the object will be stored
  const objectPath = path.join(process.cwd(), ".git", "objects", sha1.slice(0, 2), sha1.slice(2));

  // Create the directory if it doesn't exist
  fs.mkdirSync(path.dirname(objectPath), { recursive: true });

  // Write the compressed blob object to the .git/objects directory
  fs.writeFileSync(objectPath, compressedStore);

  // Output the SHA-1 hash
  console.log(sha1);
}
