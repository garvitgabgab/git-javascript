





// const fs = require("fs");
// const path = require("path");
// const zlib = require("zlib");
// const crypto = require("crypto");

// const command = process.argv[2];

// switch (command) {
//   case "init":
//     createGitDirectory();
//     break;
//   case "write-tree":
//     writeTree();
//     break;
//   case "cat-file":
//     const flag = process.argv[3];
//     const blobSHA = process.argv[4];
//     if (flag === "-p") {
//       prettyPrintObject(blobSHA);
//     } else {
//       throw new Error(`Unknown flag ${flag}`);
//     }
//     break;
//   case "hash-object":
//     const writeFlag = process.argv[3];
//     const fileName = process.argv[4];
//     if (writeFlag === "-w") {
//       hashObject(fileName);
//     } else {
//       throw new Error(`Unknown flag ${writeFlag}`);
//     }
//     break;
//   case "ls-tree":
//     const lsFlag = process.argv[3];
//     const treeSHA = process.argv[4];
//     if (lsFlag === "--name-only") {
//       lsTreeNameOnly(treeSHA);
//     } else {
//       throw new Error(`Unknown flag ${lsFlag}`);
//     }
//     break;
//   default:
//     throw new Error(`Unknown command ${command}`);
// }

// function createGitDirectory() {
//   fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
//   fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
//   fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

//   fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
//   console.log("Initialized git directory");
// }

// function writeTree() {
//   const rootTreeSHA = writeTreeRecursive(process.cwd());
//   console.log(rootTreeSHA);
// }

// function writeTreeRecursive(dir) {
//   let treeEntries = [];
  
//   const files = fs.readdirSync(dir);

//   files.forEach(file => {
//     if (file === ".git") return; // Skip .git directory

//     const filePath = path.join(dir, file);
//     const stats = fs.statSync(filePath);

//     if (stats.isDirectory()) {
//       const subTreeSHA = writeTreeRecursive(filePath);
//       const mode = "040000"; // Directory mode
//       treeEntries.push(Buffer.concat([Buffer.from(`${mode} ${file}\0`), Buffer.from(subTreeSHA, "hex")]));
//     } else if (stats.isFile()) {
//       const blobSHA = hashObject(filePath);
//       const mode = (stats.mode & 0o111) ? "100755" : "100644"; // Executable or regular file
//       treeEntries.push(Buffer.concat([Buffer.from(`${mode} ${file}\0`), Buffer.from(blobSHA, "hex")]));
//     }
//   });

//   // Concatenate tree entries and calculate tree SHA
//   const treeData = Buffer.concat(treeEntries);
//   const header = Buffer.from(`tree ${treeData.length}\0`);
//   const store = Buffer.concat([header, treeData]);

//   const treeSHA = crypto.createHash("sha1").update(store).digest("hex");

//   const objectPath = path.join(process.cwd(), ".git", "objects", treeSHA.slice(0, 2));
//   if (!fs.existsSync(objectPath)) {
//     fs.mkdirSync(objectPath);
//   }

//   const filePath = path.join(objectPath, treeSHA.slice(2));
//   const compressedData = zlib.deflateSync(store);
//   fs.writeFileSync(filePath, compressedData);

//   return treeSHA;
// }

// function hashObject(filePath) {
//   const fileContent = fs.readFileSync(filePath);
//   const header = `blob ${fileContent.length}\0`;
//   const store = Buffer.concat([Buffer.from(header), fileContent]);
//   const sha1Hash = crypto.createHash("sha1").update(store).digest("hex");

//   const objectPath = path.join(process.cwd(), ".git", "objects", sha1Hash.slice(0, 2));
//   if (!fs.existsSync(objectPath)) {
//     fs.mkdirSync(objectPath);
//   }

//   const filePathHash = path.join(objectPath, sha1Hash.slice(2));
//   const compressedData = zlib.deflateSync(store);
//   fs.writeFileSync(filePathHash, compressedData);

//   return sha1Hash;
// }

// function prettyPrintObject(blobSHA) {
//   const blobPath = path.join(process.cwd(), ".git", "objects", blobSHA.slice(0, 2), blobSHA.slice(2));
//   const blobData = fs.readFileSync(blobPath);
//   const decompressedData = zlib.inflateSync(blobData).toString("utf-8");
//   const content = decompressedData.split("\0")[1];
//   process.stdout.write(content); // No newline at the end
// }

// function lsTreeNameOnly(treeSHA) {
//   const treePath = path.join(process.cwd(), ".git", "objects", treeSHA.slice(0, 2), treeSHA.slice(2));
//   const treeData = fs.readFileSync(treePath);
//   const decompressedData = zlib.inflateSync(treeData);

//   let index = 0;
//   const entries = [];

//   // Ensure the decompressed data has the correct tree header
//   if (!decompressedData.slice(0, 4).equals(Buffer.from('tree'))) {
//     throw new Error("Invalid tree object format");
//   }

//   // Skip the 'tree <size>\0' header
//   index = decompressedData.indexOf(0) + 1;

//   while (index < decompressedData.length) {
//     // Find mode
//     const modeEnd = decompressedData.indexOf(32, index); // Space ' ' delimiter
//     const mode = decompressedData.slice(index, modeEnd).toString(); // Mode is a string

//     // Find name
//     const nameEnd = decompressedData.indexOf(0, modeEnd + 1); // Null byte '\0' delimiter
//     const name = decompressedData.slice(modeEnd + 1, nameEnd).toString(); // Name is a string

//     entries.push(name);

//     // Advance index past the entry (mode + name + null byte + 20-byte SHA1)
//     index = nameEnd + 1 + 20; // Move past the SHA-1 hash
//   }

//   // Alphabetical sorting
//   entries.sort();

//   // Output each name
//   entries.forEach((entry) => console.log(entry));
// }





const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper function to hash content
function hashObject(content, type = 'blob') {
    const header = `${type} ${content.length}\0`;
    const store = header + content;

    const hash = crypto.createHash('sha1');
    hash.update(store);
    return hash.digest('hex');
}

// Recursive function to create tree object
function writeTreeRecursive(directory) {
    const entries = fs.readdirSync(directory);

    const treeEntries = entries.map(entry => {
        const fullPath = path.join(directory, entry);
        const stats = fs.statSync(fullPath);

        if (stats.isFile()) {
            const content = fs.readFileSync(fullPath);
            const hash = hashObject(content);
            const mode = "100644"; // Regular non-executable file mode

            if (!hash) {
                console.error(`Failed to hash object for ${fullPath}`);
                return;
            }

            return `${mode} ${entry}\0${hash}`;
        } else if (stats.isDirectory()) {
            const subTreeHash = writeTreeRecursive(fullPath); // Recursively handle directories

            if (!subTreeHash) {
                console.error(`Failed to create tree object for ${fullPath}`);
                return;
            }

            const mode = "40000"; // Directory mode
            return `${mode} ${entry}\0${subTreeHash}`;
        }
    }).filter(entry => entry); // Filter out undefined entries

    const treeContent = treeEntries.join('');
    const treeHash = hashObject(treeContent, 'tree');

    return treeHash;
}

// Command handlers
function handleInit() {
    if (!fs.existsSync('.git')) {
        fs.mkdirSync('.git');
        fs.mkdirSync(path.join('.git', 'objects'));
        console.log('Initialized git directory');
    } else {
        console.log('Git directory already exists');
    }
}

function handleWriteTree() {
    const treeHash = writeTreeRecursive(process.cwd());
    if (treeHash) {
        console.log(treeHash);

        const objectDir = path.join('.git', 'objects', treeHash.substring(0, 2));
        const objectPath = path.join(objectDir, treeHash.substring(2));

        if (!fs.existsSync(objectDir)) {
            fs.mkdirSync(objectDir);
        }

        const treeContent = Buffer.from(`tree ${treeHash.length}\0${treeHash}`);
        fs.writeFileSync(objectPath, treeContent);
    } else {
        console.error('Failed to write tree object');
    }
}

function handleHashObject(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath);
    const hash = hashObject(content);

    if (!hash) {
        console.error(`Failed to hash object for ${filePath}`);
        return;
    }

    console.log(hash);

    const objectDir = path.join('.git', 'objects', hash.substring(0, 2));
    const objectPath = path.join(objectDir, hash.substring(2));

    if (!fs.existsSync(objectDir)) {
        fs.mkdirSync(objectDir);
    }

    fs.writeFileSync(objectPath, Buffer.from(`blob ${content.length}\0${content}`));
}

// Main function to handle script arguments
function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'init':
            handleInit();
            break;
        case 'write-tree':
            handleWriteTree();
            break;
        case 'hash-object':
            handleHashObject(args[2]);
            break;
        default:
            console.error(`Unknown command: ${command}`);
    }
}

main();
