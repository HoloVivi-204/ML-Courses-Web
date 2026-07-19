export interface EnrollmentResult {
  access: {
    moduleId: string;
    postId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
}

export interface DemoCompletionResult {
  completion: {
    demoId: string;
    status: 'completed';
  };
  event: {
    demoId: string;
    requiredStepIds: readonly string[];
    type: 'demo_completed';
    viewedStepIds: readonly string[];
  };
}

export interface LearningApiClient {
  bootstrapProfile(idToken: string): Promise<void>;
  completeDemo(input: {
    demoId: string;
    idToken: string;
    idempotencyKey: string;
    viewedStepIds: readonly string[];
  }): Promise<DemoCompletionResult>;
  enrollCourse(input: {
    courseId: string;
    idToken: string;
    idempotencyKey: string;
  }): Promise<EnrollmentResult>;
}

interface SuccessEnvelope<TData> {
  data: TData;
  success: true;
}

async function readSuccessEnvelope<TData>(response: Response): Promise<TData> {
  if (!response.ok) {
    throw new Error('Learning API request failed.');
  }

  const body = (await response.json()) as SuccessEnvelope<TData>;

  if (body.success !== true) {
    throw new Error('Learning API returned an invalid success envelope.');
  }

  return body.data;
}

export function createFetchLearningApiClient(): LearningApiClient {
  return {
    async bootstrapProfile(idToken) {
      await readSuccessEnvelope(
        await fetch('/api/v1/users/me/bootstrap', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        }),
      );
    },
    async completeDemo({ demoId, idToken, idempotencyKey, viewedStepIds }) {
      return readSuccessEnvelope<DemoCompletionResult>(
        await fetch(`/api/v1/demos/${encodeURIComponent(demoId)}/completions`, {
          body: JSON.stringify({ viewedStepIds }),
          headers: {
            authorization: `Bearer ${idToken}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          method: 'POST',
        }),
      );
    },
    async enrollCourse({ courseId, idToken, idempotencyKey }) {
      return readSuccessEnvelope<EnrollmentResult>(
        await fetch(`/api/v1/courses/${encodeURIComponent(courseId)}/enrollments`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${idToken}`,
            'idempotency-key': idempotencyKey,
          },
        }),
      );
    },
  };
}
