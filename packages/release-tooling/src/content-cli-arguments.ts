export interface FetchSourceCommand {
  sourceId: string;
}

export interface CourseCommand {
  courseId: string;
}

function getRequiredValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

export function parseFetchSourceCommand(argv: readonly string[]): FetchSourceCommand {
  if (argv.length !== 2) {
    const firstArgument = argv[0];

    if (firstArgument?.startsWith('--') && firstArgument !== '--source') {
      throw new Error(`Unsupported argument: ${firstArgument}`);
    }

    throw new Error('content:fetch requires exactly --source <sourceId>.');
  }

  if (argv[0] !== '--source') {
    throw new Error(`Unsupported argument: ${argv[0] ?? ''}`);
  }

  return { sourceId: getRequiredValue(argv, 0, '--source') };
}

export function parseScopeValidationCommand(argv: readonly string[]): void {
  if (argv.length > 0) {
    throw new Error('content:scope:validate does not accept arguments.');
  }
}

export function parseCourseCommand(argv: readonly string[], commandName: string): CourseCommand {
  if (argv.length !== 2 || argv[0] !== '--course') {
    throw new Error(`${commandName} requires exactly --course <courseId>.`);
  }

  return { courseId: getRequiredValue(argv, 0, '--course') };
}
