import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

export function getConfig() {
  const localEnv = loadEnvFile(path.resolve(process.cwd(), '.env'));
  const userConfigPath = path.join(os.homedir(), '.config', 'tatupeba', 'config.json');
  let userConfig = {};
  if (fs.existsSync(userConfigPath)) {
    try {
      userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));
    } catch {
      // Ignora erro de JSON malformado
    }
  }

  const userId = process.env.ZOTERO_USER_ID || localEnv.ZOTERO_USER_ID || userConfig.userId || '';

  const apiKey = process.env.ZOTERO_API_KEY || localEnv.ZOTERO_API_KEY || userConfig.apiKey || '';

  const homeDir = os.homedir();
  const obsidianRefsDir =
    process.env.OBSIDIAN_REFS_DIR ||
    localEnv.OBSIDIAN_REFS_DIR ||
    userConfig.obsidianRefsDir ||
    path.join(homeDir, 'obsidian', '03_referencia');

  const joajuBibPath =
    process.env.JOAJU_BIB_PATH ||
    localEnv.JOAJU_BIB_PATH ||
    userConfig.joajuBibPath ||
    path.join(homeDir, 'src', 'joaju', 'data', 'referencias.bib');

  const serverToken =
    process.env.TATUPEBA_TOKEN || localEnv.TATUPEBA_TOKEN || userConfig.serverToken || '';

  return {
    userId,
    apiKey,
    serverToken,
    obsidianRefsDir,
    joajuBibPath,
    apiVersion: '3'
  };
}
