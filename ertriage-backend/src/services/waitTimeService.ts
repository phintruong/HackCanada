const mockWaitTimes: Record<string, string> = {
  kitchener: '4-6 hours',
  toronto: '5-8 hours',
  ottawa: '3-5 hours',
  vancouver: '4-7 hours',
  montreal: '6-9 hours',
  calgary: '3-5 hours',
  edmonton: '4-6 hours',
  winnipeg: '3-4 hours',
  halifax: '4-6 hours',
};

export async function fetchWaitTime(city: string): Promise<string> {
  // TODO: Implement CIHI data fetch when ready
  return mockWaitTimes[city.toLowerCase()] || '3-6 hours (estimate)';
}
