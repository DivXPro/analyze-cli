import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as db from '../../dist/db/client.js';
const { close: closeDb } = db;
import * as migrate from '../../dist/db/migrate.js';
const { runMigrations } = migrate;
import * as seed from '../../dist/db/seed.js';
const { seedAll } = seed;
import * as platforms from '../../dist/db/platforms.js';
const { createPlatform } = platforms;
import * as posts from '../../dist/db/posts.js';
const { createPost, getPostById } = posts;
import * as tasks from '../../dist/db/tasks.js';
const { createTask } = tasks;
import * as taskTargets from '../../dist/db/task-targets.js';
const { createTaskTarget } = taskTargets;
import * as taskPostStatus from '../../dist/db/task-post-status.js';
const { getTaskPostStatus, getPendingPostIds } = taskPostStatus;
import * as comments from '../../dist/db/comments.js';
const { listCommentsByPost } = comments;
import * as mediaFiles from '../../dist/db/media-files.js';
const { listMediaFilesByPost } = mediaFiles;
import * as utils from '../../dist/shared/utils.js';
const { now } = utils;

import { getHandlers } from '../../dist/daemon/handlers.js';

const RUN_ID = `flow_${Date.now()}`;
const TEST_PLATFORM = `${RUN_ID}_platform`;

// Helper: create a temp JS file and return the command template
function makeTempScript(content: string): string {
  const tmpFile = path.join(os.tmpdir(), `prepare-test-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmpFile, content);
  return tmpFile;
}

function cleanupTempScript(filePath: string): void {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

describe('prepare-data — flow integration', { timeout: 30000 }, () => {
  before(async () => {
    closeDb();
    await runMigrations();
    await seedAll();

    await createPlatform({
      id: TEST_PLATFORM,
      name: `Flow Test (${RUN_ID})`,
      description: 'Prepare-data flow integration test',
    });
  });

  async function createTestPost(platformPostId: string, metadata?: any) {
    return createPost({
      platform_id: TEST_PLATFORM,
      platform_post_id: platformPostId,
      title: `Original Title ${platformPostId}`,
      content: 'Original content',
      author_id: null,
      author_name: 'Test Author',
      author_url: null,
      url: null,
      cover_url: null,
      post_type: 'text',
      like_count: 10,
      collect_count: 2,
      comment_count: 0,
      share_count: 0,
      play_count: 0,
      score: null,
      tags: null,
      media_files: null,
      published_at: null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  }

  async function createTestTask(taskId: string, templates: any) {
    await createTask({
      id: taskId,
      name: 'Flow Test Task',
      description: 'Integration test for prepare-data flow',
      template_id: null,
      cli_templates: JSON.stringify(templates),
      status: 'pending',
      stats: { total: 0, done: 0, failed: 0 },
      created_at: now(),
      updated_at: now(),
      completed_at: null,
    });
  }

  async function bindPostToTask(taskId: string, postId: string) {
    await createTaskTarget(taskId, 'post', postId);
    const { upsertTaskPostStatus } = await import('../../dist/db/task-post-status.js');
    await upsertTaskPostStatus(taskId, postId, { status: 'pending' });
  }

  async function runPrepareDataAndWait(taskId: string): Promise<'done' | 'failed'> {
    const handlers = getHandlers();
    const result = await handlers['task.prepareData']({ task_id: taskId });
    assert.equal(result.started, true, `prepareData failed: ${(result as any).reason}`);

    const start = Date.now();
    while (Date.now() - start < 10000) {
      const show = await handlers['task.show']({ task_id: taskId });
      const status = (show as any).phases?.dataPreparation?.status;
      if (status === 'done' || status === 'failed') return status;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for prepare-data for task ${taskId}`);
  }

  it('should complete full flow: note + comments + media', async () => {
    const noteScript = makeTempScript(`console.log(JSON.stringify({title:'Updated Title',content:'Updated Content'}))`);
    const commentScript = makeTempScript(`console.log(JSON.stringify([{id:'c1',content:'Great post',likeCount:5}]))`);
    const mediaScript = makeTempScript(`console.log(JSON.stringify([{url:'https://example.com/img.jpg',type:'image'}]))`);

    const taskId = `${RUN_ID}_full_${Date.now()}`;
    const post = await createTestPost('full_flow', { note_id: 'note123' });
    await createTestTask(taskId, {
      fetch_note: `node ${noteScript} {post_id}`,
      fetch_comments: `node ${commentScript} {post_id}`,
      fetch_media: `node ${mediaScript} {post_id}`,
    });
    await bindPostToTask(taskId, post.id);

    try {
      const finalStatus = await runPrepareDataAndWait(taskId);
      assert.equal(finalStatus, 'done');

      const updatedPost = await getPostById(post.id);
      assert.equal(updatedPost?.title, 'Updated Title');
      assert.equal(updatedPost?.content, 'Updated Content');

      const commentList = await listCommentsByPost(post.id, 100);
      assert.equal(commentList.length, 1);
      assert.equal(commentList[0].content, 'Great post');

      const mediaList = await listMediaFilesByPost(post.id);
      assert.equal(mediaList.length, 1);

      const status = await getTaskPostStatus(taskId, post.id);
      assert.equal(status?.status, 'done');
      assert.equal(status?.comments_fetched, true);
      assert.equal(status?.media_fetched, true);
      assert.equal(status?.comments_count, 1);
      assert.equal(status?.media_count, 1);
    } finally {
      cleanupTempScript(noteScript);
      cleanupTempScript(commentScript);
      cleanupTempScript(mediaScript);
    }
  });

  it('should mark comments_fetched and media_fetched true when templates not configured', async () => {
    const noteScript = makeTempScript(`console.log(JSON.stringify({title:'Note Only Title'}))`);

    const taskId = `${RUN_ID}_noteonly_${Date.now()}`;
    const post = await createTestPost('note_only', { note_id: 'note456' });
    await createTestTask(taskId, {
      fetch_note: `node ${noteScript} {post_id}`,
    });
    await bindPostToTask(taskId, post.id);

    try {
      const finalStatus = await runPrepareDataAndWait(taskId);
      assert.equal(finalStatus, 'done');

      const status = await getTaskPostStatus(taskId, post.id);
      assert.equal(status?.status, 'done');
      assert.equal(status?.comments_fetched, true, 'comments_fetched should be auto-marked true');
      assert.equal(status?.media_fetched, true, 'media_fetched should be auto-marked true');
    } finally {
      cleanupTempScript(noteScript);
    }
  });

  it('should mark post as failed when fetch_note fails and not reprocess', async () => {
    const failScript = makeTempScript(`process.stderr.write('fetch_note_error'); process.exit(1)`);
    const emptyScript = makeTempScript(`console.log('[]')`);

    const taskId = `${RUN_ID}_notefail_${Date.now()}`;
    const post = await createTestPost('note_fail', { note_id: 'note789' });
    await createTestTask(taskId, {
      fetch_note: `node ${failScript} {post_id}`,
      fetch_comments: `node ${emptyScript} {post_id}`,
      fetch_media: `node ${emptyScript} {post_id}`,
    });
    await bindPostToTask(taskId, post.id);

    try {
      const finalStatus = await runPrepareDataAndWait(taskId);
      assert.equal(finalStatus, 'failed');

      const status = await getTaskPostStatus(taskId, post.id);
      assert.equal(status?.status, 'failed');
      assert.ok(status?.error?.includes('fetch_note_error'), `error should contain fetch_note_error, got: ${status?.error}`);

      const pending = await getPendingPostIds(taskId);
      const pendingIds = pending.map(p => p.post_id);
      assert.ok(!pendingIds.includes(post.id), 'failed post should not appear in pending list');
    } finally {
      cleanupTempScript(failScript);
      cleanupTempScript(emptyScript);
    }
  });

  it('should execute fetch_media even when fetch_comments fails', async () => {
    const noteScript = makeTempScript(`console.log(JSON.stringify({title:'Both Title'}))`);
    const failScript = makeTempScript(`process.stderr.write('comments_error'); process.exit(1)`);
    const mediaScript = makeTempScript(`console.log(JSON.stringify([{url:'https://example.com/media.jpg',type:'image'}]))`);

    const taskId = `${RUN_ID}_commentsfail_${Date.now()}`;
    const post = await createTestPost('comments_fail', { note_id: 'note999' });
    await createTestTask(taskId, {
      fetch_note: `node ${noteScript} {post_id}`,
      fetch_comments: `node ${failScript} {post_id}`,
      fetch_media: `node ${mediaScript} {post_id}`,
    });
    await bindPostToTask(taskId, post.id);

    try {
      const finalStatus = await runPrepareDataAndWait(taskId);
      assert.equal(finalStatus, 'done');

      const commentList = await listCommentsByPost(post.id, 100);
      assert.equal(commentList.length, 0);

      const mediaList = await listMediaFilesByPost(post.id);
      assert.equal(mediaList.length, 1);

      const status = await getTaskPostStatus(taskId, post.id);
      assert.equal(status?.status, 'done');
      assert.equal(status?.comments_fetched, false);
      assert.equal(status?.media_fetched, true);
      assert.ok(status?.error?.includes('comments_error'), `error should preserve comments_error, got: ${status?.error}`);
    } finally {
      cleanupTempScript(noteScript);
      cleanupTempScript(failScript);
      cleanupTempScript(mediaScript);
    }
  });

  it('should skip already-done posts on resume', async () => {
    const noteScript = makeTempScript(`console.log(JSON.stringify({title:'Resumed'}))`);

    const taskId = `${RUN_ID}_resume_${Date.now()}`;
    const postDone = await createTestPost('resume_done', { note_id: 'done_note' });
    const postPending = await createTestPost('resume_pending', { note_id: 'pending_note' });
    await createTestTask(taskId, {
      fetch_note: `node ${noteScript} {post_id}`,
    });
    await bindPostToTask(taskId, postDone.id);
    await bindPostToTask(taskId, postPending.id);

    const { upsertTaskPostStatus } = await import('../../dist/db/task-post-status.js');
    await upsertTaskPostStatus(taskId, postDone.id, { status: 'done', comments_fetched: true, media_fetched: true });

    try {
      const finalStatus = await runPrepareDataAndWait(taskId);
      assert.equal(finalStatus, 'done');

      const donePost = await getPostById(postDone.id);
      assert.equal(donePost?.title, 'Original Title resume_done');

      const pendingPost = await getPostById(postPending.id);
      assert.equal(pendingPost?.title, 'Resumed');

      const statuses = await (await import('../../dist/db/task-post-status.js')).getTaskPostStatuses(taskId);
      assert.equal(statuses.length, 2);
      assert.ok(statuses.every(s => s.status === 'done'));
    } finally {
      cleanupTempScript(noteScript);
    }
  });
});
