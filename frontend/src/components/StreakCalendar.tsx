'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getCheckinCalendar, CalendarDay } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Calendar, Flame, TrendingUp } from 'lucide-react';

interface StreakCalendarProps {
  userId: string;
  days?: number;
}

export default function StreakCalendar({ userId, days = 35 }: StreakCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        setLoading(true);
        const data = await getCheckinCalendar(userId, days);
        setCalendarData(data);

        // Calculate streaks
        const { current, longest } = calculateStreaks(data);
        setCurrentStreak(current);
        setLongestStreak(longest);
      } catch (err) {
        console.error('Failed to load calendar:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadCalendar();
    }
  }, [userId, days]);

  // Generate all dates for the past N days
  const generateDateGrid = () => {
    const dates: { date: string; dayOfWeek: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
      });
    }

    return dates;
  };

  const calculateStreaks = (data: CalendarDay[]) => {
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Create a map for quick lookup
    const dateMap = new Map(data.map(d => [d.date, d]));
    const today = new Date();

    // Check consecutive days from today going backwards
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dateMap.get(dateStr);

      if (dayData && dayData.completed > 0) {
        tempStreak++;
        if (i === 0 || current === i) {
          current = tempStreak;
        }
      } else if (i > 0) {
        // Only break streak if not today (give today a pass if not checked in yet)
        longest = Math.max(longest, tempStreak);
        tempStreak = 0;
      }
    }

    longest = Math.max(longest, tempStreak);

    return { current, longest };
  };

  const getDayStatus = (dateStr: string) => {
    const dayData = calendarData.find(d => d.date === dateStr);
    if (!dayData) return 'none';
    if (dayData.completed > 0) return 'completed';
    if (dayData.missed > 0) return 'missed';
    return 'none';
  };

  const dateGrid = generateDateGrid();
  const weeks: { date: string; dayOfWeek: number }[][] = [];
  let currentWeek: { date: string; dayOfWeek: number }[] = [];

  // Pad the first week with empty slots
  if (dateGrid.length > 0) {
    const firstDayOfWeek = dateGrid[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', dayOfWeek: i });
    }
  }

  dateGrid.forEach((day) => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  if (loading) {
    return (
      <Card variant="bordered">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="w-6 h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
          Check-in Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Streak Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
              <p className="text-xs text-gray-500">Current</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold text-indigo-600">{longestStreak}</p>
              <p className="text-xs text-gray-500">Longest</p>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="w-6 h-4 text-center text-xs text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                if (!day.date) {
                  return <div key={dayIndex} className="w-6 h-6" />;
                }

                const status = getDayStatus(day.date);
                const isToday = day.date === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'w-6 h-6 rounded transition-all',
                      status === 'completed' && 'bg-green-500',
                      status === 'missed' && 'bg-red-300',
                      status === 'none' && 'bg-gray-100',
                      isToday && 'ring-2 ring-indigo-500 ring-offset-1'
                    )}
                    title={`${day.date}${status === 'completed' ? ' - Completed!' : status === 'missed' ? ' - Missed' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-300 rounded"></div>
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded border border-gray-200"></div>
            <span>No check-in</span>
          </div>
        </div>

        {calendarData.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Start checking in to build your streak!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
