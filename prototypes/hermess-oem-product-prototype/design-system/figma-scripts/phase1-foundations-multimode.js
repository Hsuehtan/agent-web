// Hermess OEM A+C Design System
// Phase 1 Foundations: preferred multi-mode version.
//
// Use only when the Figma file supports more than 1 variable mode per collection.
// This script creates one Color collection with:
// - Light / Enterprise Blue
// - Dark / Agent Command
//
// This is a draft for the upgraded-plan path. It should be run in small validated
// chunks if MCP limits are strict.

const RUN_ID = "hermess-oem-ac-v1";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255
  };
}

async function ensureCollection(name, key, modes) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.getSharedPluginData("dsb", "key") === key) ||
    collections.find((c) => c.name === name);
  let created = false;
  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
    created = true;
  }
  collection.setSharedPluginData("dsb", "run_id", RUN_ID);
  collection.setSharedPluginData("dsb", "phase", "phase1");
  collection.setSharedPluginData("dsb", "key", key);
  const modeIds = {};
  for (const modeName of modes) {
    const existing = collection.modes.find((m) => m.name === modeName);
    if (existing) {
      modeIds[modeName] = existing.modeId;
    } else if (collection.modes.length === 1 && /^Mode\\s*1$/i.test(collection.modes[0].name)) {
      collection.renameMode(collection.modes[0].modeId, modeName);
      modeIds[modeName] = collection.modes[0].modeId;
    } else {
      modeIds[modeName] = collection.addMode(modeName);
    }
  }
  return { collection, created, modeIds };
}

// Keep this script as a template. When plan supports multi-mode, port the token
// maps from phase1-foundations-starter-compatible.js and set values per mode:
//
// const color = await ensureCollection("Color", "collection/color", [
//   "Light / Enterprise Blue",
//   "Dark / Agent Command"
// ]);
//
// const v = figma.variables.createVariable("color/bg/app", color.collection, "COLOR");
// v.setValueForMode(color.modeIds["Light / Enterprise Blue"], hexToRgb("#F8FAFC"));
// v.setValueForMode(color.modeIds["Dark / Agent Command"], hexToRgb("#0B1220"));
// v.scopes = ["FRAME_FILL", "SHAPE_FILL"];
// v.setVariableCodeSyntax("WEB", "var(--hds-color-bg-app)");

return {
  runId: RUN_ID,
  phase: "phase1-foundations-multimode-template",
  status: "template-ready",
  note: "Use this after upgrading to a Figma plan that supports multiple variable modes."
};
