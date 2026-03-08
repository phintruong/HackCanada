import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import path from 'path';

// Directory where buildings are saved
const BUILDINGS_DIR = path.join(process.cwd(), 'public', 'map-data', 'buildings');

// Simple ID generator
function generateId(): string {
  return `bld_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Ensure the buildings directory exists
async function ensureBuildingsDir() {
  try {
    await mkdir(BUILDINGS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Clean up old entries (older than 24 hours)
async function cleanupOldEntries() {
  try {
    const files = await readdir(BUILDINGS_DIR);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.endsWith('.glb')) {
        const filePath = path.join(BUILDINGS_DIR, file);
        const stats = await stat(filePath);
        if (stats.mtimeMs < oneDayAgo) {
          await unlink(filePath);
          // Also remove the JSON sidecar
          const jsonSidecar = path.join(BUILDINGS_DIR, file.replace('.glb', '.json'));
          try { await unlink(jsonSidecar); } catch { /* may not exist */ }
          console.log(`🗑️ Cleaned up old building: ${file}`);
        }
      }
    }
  } catch (error) {
    // Directory might not exist yet
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure directory exists
    await ensureBuildingsDir();

    // Clean up old entries periodically
    await cleanupOldEntries();

    const contentType = request.headers.get('content-type') || '';

    let arrayBuffer: ArrayBuffer;
    let name = 'building';
    let metadata: Record<string, unknown> | null = null;

    if (contentType.includes('multipart/form-data')) {
      // FormData from exportToMap — contains glb file + metadata JSON + name
      const formData = await request.formData();
      const glbFile = formData.get('glb') as File | null;
      const metadataStr = formData.get('metadata') as string | null;
      const nameField = formData.get('name') as string | null;

      if (!glbFile) {
        return NextResponse.json(
          { error: 'Missing glb file in form data' },
          { status: 400 }
        );
      }

      arrayBuffer = await glbFile.arrayBuffer();
      name = nameField || 'building';

      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch {
          console.warn('⚠️ Could not parse metadata JSON, skipping');
        }
      }
    } else if (contentType.includes('application/octet-stream')) {
      // Binary GLB data (legacy path)
      arrayBuffer = await request.arrayBuffer();
      name = request.headers.get('x-building-name') || 'building';
    } else {
      return NextResponse.json(
        { error: 'Invalid content type. Expected multipart/form-data or application/octet-stream' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const id = generateId();
    const glbFilename = `${id}.glb`;
    const glbPath = path.join(BUILDINGS_DIR, glbFilename);

    // Save the GLB file
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(glbPath, buffer);

    // Save metadata sidecar JSON if present
    const beds = (metadata as any)?.erBeds ?? (metadata as any)?.totalBeds ?? 50;
    const sidecar = {
      id,
      name,
      beds,
      metadata,
      createdAt: new Date().toISOString(),
    };
    const jsonPath = path.join(BUILDINGS_DIR, `${id}.json`);
    await writeFile(jsonPath, JSON.stringify(sidecar, null, 2));

    console.log(`✅ Saved building to ${glbPath} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB) with metadata`);

    return NextResponse.json({
      id,
      name,
      beds,
      size: arrayBuffer.byteLength,
      publicPath: `/map-data/buildings/${glbFilename}`,
      metadata: sidecar,
    });
  } catch (error) {
    console.error('Error storing building:', error);
    return NextResponse.json(
      { error: 'Failed to store building' },
      { status: 500 }
    );
  }
}

// List all saved buildings (enriched with metadata from JSON sidecar)
export async function GET() {
  try {
    await ensureBuildingsDir();
    const files = await readdir(BUILDINGS_DIR);
    const buildings = [];

    for (const f of files) {
      if (!f.endsWith('.glb')) continue;
      const id = f.replace('.glb', '');
      const jsonPath = path.join(BUILDINGS_DIR, `${id}.json`);

      let sidecar: Record<string, unknown> = {};
      try {
        const raw = await readFile(jsonPath, 'utf-8');
        sidecar = JSON.parse(raw);
      } catch {
        // No sidecar — use defaults
      }

      buildings.push({
        id,
        filename: f,
        publicPath: `/map-data/buildings/${f}`,
        name: (sidecar.name as string) || 'Custom Building',
        beds: (sidecar.beds as number) || 50,
        metadata: sidecar.metadata || null,
      });
    }

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Error listing buildings:', error);
    return NextResponse.json({ buildings: [] });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing building id' }, { status: 400 });
    }

    const glbPath = path.join(BUILDINGS_DIR, `${id}.glb`);
    const jsonPath = path.join(BUILDINGS_DIR, `${id}.json`);

    try { await unlink(glbPath); } catch { /* may not exist */ }
    try { await unlink(jsonPath); } catch { /* may not exist */ }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting building:', error);
    return NextResponse.json({ error: 'Failed to delete building' }, { status: 500 });
  }
}
