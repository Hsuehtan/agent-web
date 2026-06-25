// Hermess OEM A+C Design System
// Phase 1 Foundations: Starter-compatible version.
//
// Use when the Figma file only supports one variable mode per collection.
// This creates separate color collections for light and dark themes.
//
// Paste into use_figma after loading figma-use and figma-generate-library.
// Expected file: https://www.figma.com/design/R7WB3DdYyUOTDK3B9eTSZD

const RUN_ID = "hermess-oem-ac-v1";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255
  };
}

async function findCollection(name, key) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return collections.find((c) => c.getSharedPluginData("dsb", "key") === key) ||
    collections.find((c) => c.name === name) ||
    null;
}

async function ensureCollection(name, key) {
  let collection = await findCollection(name, key);
  let created = false;
  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
    created = true;
  }
  collection.renameMode(collection.modes[0].modeId, "Value");
  collection.setSharedPluginData("dsb", "run_id", RUN_ID);
  collection.setSharedPluginData("dsb", "phase", "phase1");
  collection.setSharedPluginData("dsb", "key", key);
  return { collection, created, modeId: collection.modes[0].modeId };
}

function cssName(name) {
  return `--hds-${name.replaceAll("/", "-")}`;
}

async function ensureVariable(collection, modeId, name, type, value, scopes, codeSyntax) {
  const allVars = await figma.variables.getLocalVariablesAsync();
  let variable = allVars.find((v) => v.variableCollectionId === collection.id && v.name === name);
  let created = false;
  if (!variable) {
    variable = figma.variables.createVariable(name, collection, type);
    created = true;
  }
  variable.setValueForMode(modeId, value);
  variable.scopes = scopes;
  variable.setVariableCodeSyntax("WEB", `var(${codeSyntax})`);
  variable.setSharedPluginData("dsb", "run_id", RUN_ID);
  variable.setSharedPluginData("dsb", "phase", "phase1");
  variable.setSharedPluginData("dsb", "key", `${collection.name}/${name}`);
  return { id: variable.id, name, created };
}

const primitives = [
  ["primitive/color/blue/50", "#EFF6FF"],
  ["primitive/color/blue/100", "#DBEAFE"],
  ["primitive/color/blue/500", "#3B82F6"],
  ["primitive/color/blue/600", "#2563EB"],
  ["primitive/color/blue/700", "#1D4ED8"],
  ["primitive/color/indigo/50", "#EEF2FF"],
  ["primitive/color/indigo/500", "#6366F1"],
  ["primitive/color/indigo/600", "#4F46E5"],
  ["primitive/color/violet/500", "#8B5CF6"],
  ["primitive/color/violet/600", "#7C3AED"],
  ["primitive/color/cyan/400", "#22D3EE"],
  ["primitive/color/cyan/500", "#06B6D4"],
  ["primitive/color/navy/950", "#0B1220"],
  ["primitive/color/navy/900", "#111827"],
  ["primitive/color/navy/800", "#172033"],
  ["primitive/color/slate/50", "#F8FAFC"],
  ["primitive/color/slate/100", "#F1F5F9"],
  ["primitive/color/slate/200", "#E2E8F0"],
  ["primitive/color/slate/300", "#CBD5E1"],
  ["primitive/color/slate/500", "#64748B"],
  ["primitive/color/slate/700", "#334155"],
  ["primitive/color/slate/900", "#0F172A"],
  ["primitive/color/green/50", "#ECFDF3"],
  ["primitive/color/green/600", "#16A34A"],
  ["primitive/color/amber/50", "#FFFBEB"],
  ["primitive/color/amber/500", "#F59E0B"],
  ["primitive/color/red/50", "#FEF3F2"],
  ["primitive/color/red/600", "#DC2626"],
  ["primitive/color/neutral/white", "#FFFFFF"],
  ["primitive/color/neutral/black", "#000000"]
];

const enterpriseLight = [
  ["color/bg/app", "#F8FAFC"],
  ["color/bg/sidebar", "#0B1220"],
  ["color/bg/surface", "#FFFFFF"],
  ["color/bg/surface-subtle", "#F1F5F9"],
  ["color/bg/elevated", "#FFFFFF"],
  ["color/bg/selected", "#EFF6FF"],
  ["color/bg/tool-call", "#EFF6FF"],
  ["color/bg/agent-card", "#FFFFFF"],
  ["color/text/primary", "#0F172A"],
  ["color/text/secondary", "#334155"],
  ["color/text/muted", "#64748B"],
  ["color/text/inverse", "#FFFFFF"],
  ["color/text/accent", "#2563EB"],
  ["color/border/default", "#E2E8F0"],
  ["color/border/subtle", "#F1F5F9"],
  ["color/border/strong", "#CBD5E1"],
  ["color/border/focus", "#2563EB"],
  ["color/action/primary", "#2563EB"],
  ["color/action/primary-hover", "#1D4ED8"],
  ["color/action/secondary", "#F1F5F9"],
  ["color/action/danger", "#DC2626"],
  ["color/status/success", "#16A34A"],
  ["color/status/success-bg", "#ECFDF3"],
  ["color/status/warning", "#F59E0B"],
  ["color/status/warning-bg", "#FFFBEB"],
  ["color/status/danger", "#DC2626"],
  ["color/status/danger-bg", "#FEF3F2"],
  ["color/status/info", "#2563EB"],
  ["color/status/info-bg", "#EFF6FF"],
  ["color/status/running", "#06B6D4"],
  ["color/status/waiting", "#F59E0B"]
];

const agentDark = [
  ["color/bg/app", "#0B1220"],
  ["color/bg/sidebar", "#111827"],
  ["color/bg/surface", "#172033"],
  ["color/bg/surface-subtle", "#111827"],
  ["color/bg/elevated", "#172033"],
  ["color/bg/selected", "#4F46E5"],
  ["color/bg/tool-call", "#111827"],
  ["color/bg/agent-card", "#172033"],
  ["color/text/primary", "#F8FAFC"],
  ["color/text/secondary", "#E2E8F0"],
  ["color/text/muted", "#64748B"],
  ["color/text/inverse", "#0B1220"],
  ["color/text/accent", "#22D3EE"],
  ["color/border/default", "#334155"],
  ["color/border/subtle", "#111827"],
  ["color/border/strong", "#64748B"],
  ["color/border/focus", "#06B6D4"],
  ["color/action/primary", "#7C3AED"],
  ["color/action/primary-hover", "#8B5CF6"],
  ["color/action/secondary", "#4F46E5"],
  ["color/action/danger", "#DC2626"],
  ["color/status/success", "#16A34A"],
  ["color/status/success-bg", "#064E3B"],
  ["color/status/warning", "#F59E0B"],
  ["color/status/warning-bg", "#451A03"],
  ["color/status/danger", "#DC2626"],
  ["color/status/danger-bg", "#450A0A"],
  ["color/status/info", "#22D3EE"],
  ["color/status/info-bg", "#083344"],
  ["color/status/running", "#06B6D4"],
  ["color/status/waiting", "#F59E0B"]
];

const spacing = [
  ["spacing/0", 0],
  ["spacing/1", 4],
  ["spacing/2", 8],
  ["spacing/3", 12],
  ["spacing/4", 16],
  ["spacing/5", 20],
  ["spacing/6", 24],
  ["spacing/8", 32],
  ["spacing/10", 40],
  ["spacing/12", 48]
];

const radius = [
  ["radius/none", 0],
  ["radius/sm", 4],
  ["radius/md", 6],
  ["radius/lg", 8],
  ["radius/xl", 12],
  ["radius/full", 999]
];

const size = [
  ["size/control/sm", 32],
  ["size/control/md", 38],
  ["size/control/lg", 44],
  ["size/sidebar/expanded", 248],
  ["size/sidebar/collapsed", 64],
  ["size/panel/right", 288],
  ["size/avatar/sm", 24],
  ["size/avatar/md", 32]
];

const created = [];

const prim = await ensureCollection("Primitives", "collection/primitives");
for (const [name, hex] of primitives) {
  created.push(await ensureVariable(prim.collection, prim.modeId, name, "COLOR", hexToRgb(hex), [], cssName(name)));
}

const light = await ensureCollection("Color / Light Enterprise", "collection/color-light-enterprise");
for (const [name, hex] of enterpriseLight) {
  const scopes = name.includes("/text/") ? ["TEXT_FILL"] : name.includes("/border/") ? ["STROKE_COLOR"] : ["FRAME_FILL", "SHAPE_FILL"];
  created.push(await ensureVariable(light.collection, light.modeId, name, "COLOR", hexToRgb(hex), scopes, cssName(name)));
}

const dark = await ensureCollection("Color / Dark Agent", "collection/color-dark-agent");
for (const [name, hex] of agentDark) {
  const scopes = name.includes("/text/") ? ["TEXT_FILL"] : name.includes("/border/") ? ["STROKE_COLOR"] : ["FRAME_FILL", "SHAPE_FILL"];
  created.push(await ensureVariable(dark.collection, dark.modeId, name, "COLOR", hexToRgb(hex), scopes, cssName(name)));
}

const spacingColl = await ensureCollection("Spacing", "collection/spacing");
for (const [name, value] of spacing) {
  created.push(await ensureVariable(spacingColl.collection, spacingColl.modeId, name, "FLOAT", value, ["GAP"], cssName(name)));
}

const radiusColl = await ensureCollection("Radius", "collection/radius");
for (const [name, value] of radius) {
  created.push(await ensureVariable(radiusColl.collection, radiusColl.modeId, name, "FLOAT", value, ["CORNER_RADIUS"], cssName(name)));
}

const sizeColl = await ensureCollection("Size", "collection/size");
for (const [name, value] of size) {
  created.push(await ensureVariable(sizeColl.collection, sizeColl.modeId, name, "FLOAT", value, ["WIDTH_HEIGHT"], cssName(name)));
}

return {
  runId: RUN_ID,
  phase: "phase1-foundations-starter-compatible",
  collectionIds: {
    primitives: prim.collection.id,
    colorLightEnterprise: light.collection.id,
    colorDarkAgent: dark.collection.id,
    spacing: spacingColl.collection.id,
    radius: radiusColl.collection.id,
    size: sizeColl.collection.id
  },
  variableCount: created.length,
  variables: created
};
