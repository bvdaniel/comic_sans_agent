import { execSync } from 'child_process';
import { elizaLogger } from '@ai16z/eliza';
import { join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fontPath = join(__dirname, '..', '..', 'assets', 'fonts', 'comic.ttf');
const pythonPath = join(process.cwd(), 'venv', 'bin', 'python3');
export const detectComicSans = async (imageUrl) => {
    try {
        elizaLogger.log("🔍 Starting Comic Sans detection for image:", imageUrl);
        elizaLogger.log("📂 Using Comic Sans font from:", fontPath);
        const command = `${pythonPath} ${process.cwd()}/src/scripts/comic_sans_detector.py "${imageUrl}" "${fontPath}"`;
        elizaLogger.log("🚀 Executing command:", command);
        const result = execSync(command, {
            encoding: "utf-8",
            stdio: ['pipe', 'pipe', 'pipe']
        });
        elizaLogger.log("🔄 Raw Python output:", result);
        try {
            const parsedResult = JSON.parse(result);
            // Log all status messages
            if (parsedResult.messages) {
                parsedResult.messages.forEach(msg => {
                    elizaLogger.log("🐍 Python Status:", msg);
                });
            }
            const detectionResult = parsedResult.result || {
                is_comic_sans: false,
                confidence: 0
            };
            elizaLogger.log("✨ Comic Sans detection result:", {
                isComicSans: detectionResult.is_comic_sans,
                confidence: detectionResult.confidence,
                rawResult: parsedResult
            });
            return detectionResult;
        }
        catch (parseError) {
            elizaLogger.error("❌ Error parsing Python output:", parseError);
            elizaLogger.error("📜 Raw output that failed to parse:", result);
            throw parseError;
        }
    }
    catch (error) {
        elizaLogger.error("❌ Error running Comic Sans detection script:", error);
        elizaLogger.error("📜 Error details:", {
            message: error.message,
            stderr: error.stderr,
            stdout: error.stdout,
            status: error.status,
            signal: error.signal
        });
        throw error;
    }
};
