"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { EditMapVoteForm } from './edit-map-vote-form';
import { MapVote } from '@/types/vote';
import { ViewMapVoteResults } from './view-map-vote-results';

/* interface MapVote {
    id: string;
    name: string;
    server_id: string;
    vote_end: string;
    vote_start: string;
    server: Partial<Server>;
} */

async function fetchMapVotes(): Promise<MapVote[]> {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(backendApi('admin/map-voting'), { credentials: 'include', headers });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
}

function MapVoteCard({ vote }: { vote: MapVote }) {
    const now = new Date();
    const startDate = new Date(vote.vote_start);
    const endDate = new Date(vote.vote_end);

    const isActive = now >= startDate && now < endDate;
    const isEnded = now > endDate;
    
    const relevantDate = isEnded ? endDate : (isActive ? endDate : startDate);

    const statusText = useMemo(() => {
        if (isEnded) {
            return "Ended";
        }
        if (isActive) {
            return "Ends";
        }
        return "Starts";
    }, [isActive, isEnded]);

    return (
        <Card className="transition-colors">
            <CardHeader>
                <CardTitle className="text-lg">
                    {vote.server?.server_name}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-row justify-between items-end gap-2">
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-500">
                        Server ID: {vote.server_id}
                    </p>
                    <p className={`text-sm font-semibold ${isEnded ? "text-red-500" : isActive ? "text-green-500" : "text-amber-500"}`}>
                        {statusText} {formatDistanceToNow(relevantDate, { addSuffix: true })}
                    </p>
                    {now >= startDate && (
                        <p className="text-sm text-muted-foreground">
                            {(vote.map_options ?? []).reduce((sum, option) => sum + (option.vote_count ?? 0), 0)} votes
                        </p>
                    )}
                </div>
                <div className="flex flex-row gap-2">
                    <EditMapVoteForm vote={vote} />
                    {now >= startDate ? (
                        <ViewMapVoteResults vote={vote} />
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

function MapVoteCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent className="flex flex-row justify-between items-center gap-2">
                <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-8 w-24" />
            </CardContent>
        </Card>
    );
}

export function MapList() {
    const [search, setSearch] = useState("");
    const { data: mapVotes, isLoading, error } = useQuery<MapVote[], Error>({
        queryKey: ['mapVotes'],
        queryFn: fetchMapVotes,
    });

    const filteredMapVotes = useMemo(() => {
        return mapVotes?.filter((vote) => {
            return vote.server?.server_name?.toLowerCase().includes(search.toLowerCase());
        });
    }, [mapVotes, search]);

    if (error) {
        return <div>Error loading map votes: {error.message}</div>;
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <Input
                        className="w-64"
                        placeholder="Search Servers"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <>
                        <MapVoteCardSkeleton />
                        <MapVoteCardSkeleton />
                        <MapVoteCardSkeleton />
                    </>
                ) : (
                    filteredMapVotes?.map((vote) => (
                        <MapVoteCard key={vote.id} vote={vote} />
                    ))
                )}
            </div>
        </div>
    );
}
