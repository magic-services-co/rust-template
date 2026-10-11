"use client";

import React, { useState, useEffect } from 'react'
import { TabsList } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryItem } from './sortable-category-item'

interface Category {
  slug: string
  name: string
  order?: number | null
}

interface CategoryListProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (id: string) => void
  onReorderCategories?: (categorySlugs: string[]) => void
}

export function CategoryList({ categories, selectedCategory, onSelectCategory, onReorderCategories }: CategoryListProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, keyboardSensorOptions)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.id !== 'new') {
      const oldIndex = localCategories.findIndex((category) => category.slug === active.id);
      const newIndex = localCategories.findIndex((category) => category.slug === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(localCategories, oldIndex, newIndex);
        setLocalCategories(newCategories);
        
        if (onReorderCategories) {
          onReorderCategories(newCategories.map(category => category.slug));
        }
      }
    }
  };

  useEffect(() => {
    if (categories) {
      setLocalCategories(categories);
    }
  }, [categories]);

  return (
    <TabsList className="flex flex-col h-full w-64 space-y-2 bg-transparent items-start">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localCategories.map(category => category.slug)}
          strategy={verticalListSortingStrategy}
        >
          {localCategories.map((category) => (
            <SortableCategoryItem
              key={category.slug}
              category={category}
              isSelected={selectedCategory === category.slug}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex items-center space-x-2">
        <div className="p-1 flex-shrink-0 w-6" />
        <Button
          variant={selectedCategory === "new" ? "default" : "ghost"}
          size={"lg"}
          className={"flex-1 !justify-start text-left w-full"}
          onClick={() => onSelectCategory("new")}
        >
          <Plus className="w-4 h-4 mr-2" /> New Category
        </Button>
      </div>
    </TabsList>
  )
}

const keyboardSensorOptions = {
  coordinateGetter: sortableKeyboardCoordinates,
}