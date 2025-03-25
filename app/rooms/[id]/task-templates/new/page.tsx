"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRoomById } from "@/app/actions/rooms";
import { createTaskTemplate } from "@/app/actions/task-templates";
import { Roomie, Room, RecurrenceRule, DaysOfWeek } from "@/lib/types";

export default function NewTaskTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentRoomie, setCurrentRoomie] = useState<Roomie | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>({
    frequency: 'weekly',
    interval: 1,
    byDay: ['friday']
  });
  
  const { id } = use(params);
  const roomId = parseInt(id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Get current roomie
        const { roomie } = await getCurrentRoomie();
        if (!roomie) {
          router.push("/create-profile");
          return;
        }
        setCurrentRoomie(roomie);
        
        // Get room details
        const { data: roomData, error: roomError } = await getRoomById(roomId);
        
        if (roomError || !roomData) {
          setError(roomError || "Failed to load room");
          setLoading(false);
          return;
        }
        
        setRoom(roomData);
        setLoading(false);
      } catch (e) {
        console.error("Error loading data:", e);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    loadData();
  }, [roomId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      setError("Please provide a name for the template");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      if (!currentRoomie) {
        setError("You need to be logged in to create a template");
        setSubmitting(false);
        return;
      }
      
      const { success, error } = await createTaskTemplate({
        room_id: roomId,
        name,
        description,
        weight,
        recurring: isRecurring,
        recurrence_rule: isRecurring ? JSON.stringify(recurrenceRule) : null,
        created_by: currentRoomie.id,
      });
      
      if (!success || error) {
        setError(error || "Failed to create task template");
        setSubmitting(false);
        return;
      }
      
      router.push(`/rooms/${roomId}/task-templates`);
    } catch (e) {
      console.error("Error creating template:", e);
      setError("An unexpected error occurred");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Room not found</h1>
        <Link href="/">
          <Button variant="secondary">Back to Roomboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href={`/rooms/${roomId}/task-templates`} className="flex items-center gap-1 text-blue-600 mb-2">
          <ArrowLeft size={16} />
          Back to Templates
        </Link>
        <h1 className="text-2xl font-bold">Create New Task Template</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter template description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Importance (1-5)</Label>
              <Select value={weight.toString()} onValueChange={(value: string) => setWeight(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2 - Medium-Low</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Medium-High</SelectItem>
                  <SelectItem value="5">5 - High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="isRecurring">This is a recurring task</Label>
            </div>
            
            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="recurrencePattern">Frequency</Label>
                  <Select 
                    value={recurrenceRule.frequency} 
                    onValueChange={(value: RecurrenceRule['frequency']) => 
                      setRecurrenceRule(prev => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(recurrenceRule.frequency === 'weekly' || recurrenceRule.frequency === 'biweekly') && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DaysOfWeek.map((day: typeof DaysOfWeek[number]) => (
                        <div key={day} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={day}
                            checked={recurrenceRule.byDay?.includes(day)}
                            onChange={(e) => {
                              const newDays = e.target.checked
                                ? [...(recurrenceRule.byDay || []), day]
                                : (recurrenceRule.byDay || []).filter(d => d !== day);
                              setRecurrenceRule(prev => ({ ...prev, byDay: newDays }));
                            }}
                          />
                          <Label htmlFor={day} className="capitalize">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceRule.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Days of Month</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <div key={day} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            id={`day-${day}`}
                            checked={recurrenceRule.byMonthDay?.includes(day)}
                            onChange={(e) => {
                              const newDays = e.target.checked
                                ? [...(recurrenceRule.byMonthDay || []), day]
                                : (recurrenceRule.byMonthDay || []).filter(d => d !== day);
                              setRecurrenceRule(prev => ({ ...prev, byMonthDay: newDays }));
                            }}
                          />
                          <Label htmlFor={`day-${day}`} className="text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceRule.frequency === 'yearly' && (
                  <div className="space-y-2">
                    <Label>Months</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <div key={month} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`month-${month}`}
                            checked={recurrenceRule.byMonth?.includes(month)}
                            onChange={(e) => {
                              const newMonths = e.target.checked
                                ? [...(recurrenceRule.byMonth || []), month]
                                : (recurrenceRule.byMonth || []).filter(m => m !== month);
                              setRecurrenceRule(prev => ({ ...prev, byMonth: newMonths }));
                            }}
                          />
                          <Label htmlFor={`month-${month}`} className="capitalize">
                            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Link href={`/rooms/${roomId}/task-templates`}>
              <Button variant="outlined" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Template"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 