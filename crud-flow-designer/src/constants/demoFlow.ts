import type { FlowConfig } from '../types/flow';
import { MarkerType } from 'reactflow';

const EDGE_DEFAULTS = {
  type: 'deletable' as const,
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#64748b' },
};

/**
 * Demo CRUD flow using JSONPlaceholder (https://jsonplaceholder.typicode.com)
 * Flow: Start → Create Post → Extract ID → Verify Created → Read Post → Update Post → Delete Post → Verify Deleted
 */
export function getDemoCrudFlow(): FlowConfig {
  const Y_GAP = 130;
  const X_CENTER = 400;

  return {
    id: 'demo-crud-flow',
    name: 'JSONPlaceholder CRUD Flow',
    version: '1.0',
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      // 1. Start
      {
        id: 'start-1',
        type: 'start',
        position: { x: X_CENTER, y: 0 },
        data: {
          label: 'JSONPlaceholder API',
          baseUrl: 'https://jsonplaceholder.typicode.com',
          auth: { type: 'none' },
        },
      },
      // 2. GET /posts — List all posts
      {
        id: 'list-posts',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP },
        data: {
          label: 'List All Posts',
          method: 'GET',
          path: '/posts',
          headers: {},
        },
      },
      // 3. Assert 200 on list
      {
        id: 'assert-list',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP },
        data: {
          label: 'Assert 200 + Array',
          assertions: [
            { type: 'status_code', expected: 200 },
          ],
        },
      },
      // 4. POST /posts — Create
      {
        id: 'create-post',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP * 2 },
        data: {
          label: 'Create Post',
          method: 'POST',
          path: '/posts',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Post', body: 'Hello from LoadForge', userId: 1 }, null, 2),
        },
      },
      // 5. Assert 201
      {
        id: 'assert-create',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP * 2 },
        data: {
          label: 'Assert 201 Created',
          assertions: [
            { type: 'status_code', expected: 201 },
            { type: 'jsonpath_exists', expression: '$.id' },
          ],
        },
      },
      // 6. GET /posts/1 — Read existing post
      {
        id: 'read-post',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP * 3 },
        data: {
          label: 'Read Post #1',
          method: 'GET',
          path: '/posts/1',
          headers: {},
        },
      },
      // 7. Assert 200 on read
      {
        id: 'assert-read',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP * 3 },
        data: {
          label: 'Assert 200 OK',
          assertions: [
            { type: 'status_code', expected: 200 },
            { type: 'jsonpath_exists', expression: '$.title' },
            { type: 'jsonpath_exists', expression: '$.userId' },
          ],
        },
      },
      // 8. Extract title from response
      {
        id: 'extract-title',
        type: 'variable-extractor',
        position: { x: X_CENTER, y: Y_GAP * 4 },
        data: {
          label: 'Extract Title',
          jsonPath: '$.title',
          variableName: 'originalTitle',
          source: 'body',
        },
      },
      // 9. Small delay
      {
        id: 'delay-1',
        type: 'delay',
        position: { x: X_CENTER, y: Y_GAP * 5 },
        data: {
          label: 'Wait 300ms',
          milliseconds: 300,
        },
      },
      // 10. PUT /posts/1 — Update
      {
        id: 'update-post',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP * 6 },
        data: {
          label: 'Update Post #1',
          method: 'PUT',
          path: '/posts/1',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 1, title: 'Updated by LoadForge', body: 'This post was updated', userId: 1 }, null, 2),
        },
      },
      // 11. Assert 200 on update
      {
        id: 'assert-update',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP * 6 },
        data: {
          label: 'Assert 200 Updated',
          assertions: [
            { type: 'status_code', expected: 200 },
            { type: 'jsonpath_equals', expression: '$.title', expected: 'Updated by LoadForge' },
          ],
        },
      },
      // 12. DELETE /posts/1
      {
        id: 'delete-post',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP * 7 },
        data: {
          label: 'Delete Post #1',
          method: 'DELETE',
          path: '/posts/1',
          headers: {},
        },
      },
      // 13. Assert 200 on delete
      {
        id: 'assert-delete',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP * 7 },
        data: {
          label: 'Assert 200 Deleted',
          assertions: [
            { type: 'status_code', expected: 200 },
          ],
        },
      },
      // 14. GET non-existing post → 404
      {
        id: 'verify-404',
        type: 'http-request',
        position: { x: X_CENTER, y: Y_GAP * 8 },
        data: {
          label: 'Verify 404',
          method: 'GET',
          path: '/posts/99999',
          headers: {},
        },
      },
      // 15. Assert 404
      {
        id: 'assert-404',
        type: 'assertion',
        position: { x: X_CENTER + 300, y: Y_GAP * 8 },
        data: {
          label: 'Assert 404 Not Found',
          assertions: [
            { type: 'status_code', expected: 404 },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'list-posts', ...EDGE_DEFAULTS },
      { id: 'e2', source: 'list-posts', target: 'assert-list', ...EDGE_DEFAULTS },
      { id: 'e3', source: 'list-posts', target: 'create-post', ...EDGE_DEFAULTS },
      { id: 'e4', source: 'create-post', target: 'assert-create', ...EDGE_DEFAULTS },
      { id: 'e5', source: 'create-post', target: 'read-post', ...EDGE_DEFAULTS },
      { id: 'e6', source: 'read-post', target: 'assert-read', ...EDGE_DEFAULTS },
      { id: 'e7', source: 'read-post', target: 'extract-title', ...EDGE_DEFAULTS },
      { id: 'e8', source: 'extract-title', target: 'delay-1', ...EDGE_DEFAULTS },
      { id: 'e9', source: 'delay-1', target: 'update-post', ...EDGE_DEFAULTS },
      { id: 'e10', source: 'update-post', target: 'assert-update', ...EDGE_DEFAULTS },
      { id: 'e11', source: 'update-post', target: 'delete-post', ...EDGE_DEFAULTS },
      { id: 'e12', source: 'delete-post', target: 'assert-delete', ...EDGE_DEFAULTS },
      { id: 'e13', source: 'delete-post', target: 'verify-404', ...EDGE_DEFAULTS },
      { id: 'e14', source: 'verify-404', target: 'assert-404', ...EDGE_DEFAULTS },
    ],
  };
}

