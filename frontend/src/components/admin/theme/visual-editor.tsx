'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as React from 'react';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { prepareSanctumMutationHeaders } from '@/lib/sanctum-csrf';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eye, Save, Undo, Edit2, X, Type, Box, RotateCcw, Maximize2, Trash2, ExternalLink,
  Home, User, Settings, Search, Heart, Star, Bell, Mail, Calendar, 
  Clock, Check, X as XIcon, Plus, Minus, ArrowRight, ArrowLeft, 
  ChevronDown, ChevronUp, Menu, MoreVertical, Download, Upload, 
  Edit, Trash, Eye as EyeIcon, Lock, Unlock, Play, Pause, 
  Volume2, VolumeX, Image, File, Folder, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { persistTheme } from '@/lib/theme-storage';
import { ColorPicker } from './color-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  type ElementEdit,
  buildDraftEditsCss,
  findBestSelectableElement,
  generateSelector,
  getComponentType,
  isIconElement,
  isSelectableElement,
  isTextEditable,
  rgbToHex,
} from '@/components/theme/theme-editor-dom';
import { applyLayoutThemeMedia, buildSiteThemeCss } from '@/components/theme/theme-override-css';
import { ThemeEditorPagePicker } from '@/components/admin/theme/theme-editor-page-picker';
import { SiteEditorRail, type SiteEditorPanel } from '@/components/admin/theme/site-editor-rail';
import { LAYOUT_THEME_DEFAULTS } from '@/lib/layout-theme-defaults';
import {
  THEME_EDITOR_CORE_PAGES,
  mapCustomServerPages,
  mergeThemeEditorPages,
  withThemeEditorQuery,
} from '@/lib/theme-editor-pages';

/** Iframe documents can briefly have no <head> while parsing; avoid crashing on appendChild. */
function appendStyleToIframeDocument(doc: Document, style: HTMLStyleElement): boolean {
  const parent = doc.head ?? doc.documentElement;
  if (!parent) return false;
  parent.appendChild(style);
  return true;
}

const AVAILABLE_PAGES = THEME_EDITOR_CORE_PAGES;

interface ThemeSettings {
  enabled?: boolean;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  primaryTitleColor: string;
  secondaryTextColor: string;
  linkAccentColor: string;
  navLinkColor: string;
  navLinkHoverColor: string;
  navLinkActiveColor: string;
  primaryButtonBg: string;
  primaryButtonHover: string;
  primaryButtonText: string;
  secondaryButtonBg: string;
  secondaryButtonHover: string;
  secondaryButtonText: string;
  cardBgDefault: string;
  cardBgHover: string;
  inputBorderColor: string;
  mutedTextColor: string;
  fontFamily: string;
  borderRadius: string;
  spacing: string;
  backgroundOpacity: number;
  backgroundImage: string;
  logoImage: string;
  faviconImage: string;
}

const THEME_PROPERTIES = [
  { key: 'background', label: 'Page Background', type: 'hsl', category: 'Base Colors', cssVar: '--background' },
  { key: 'foreground', label: 'Main Text Color', type: 'hsl', category: 'Base Colors', cssVar: '--foreground' },
  { key: 'primary', label: 'Primary Color', type: 'hsl', category: 'Theme Colors', cssVar: '--primary' },
  { key: 'primaryForeground', label: 'Primary Text Color', type: 'hsl', category: 'Theme Colors', cssVar: '--primary-foreground' },
  { key: 'secondary', label: 'Secondary Color', type: 'hsl', category: 'Theme Colors', cssVar: '--secondary' },
  { key: 'secondaryForeground', label: 'Secondary Text Color', type: 'hsl', category: 'Theme Colors', cssVar: '--secondary-foreground' },
  { key: 'card', label: 'Card Background', type: 'hsl', category: 'Surfaces', cssVar: '--card' },
  { key: 'cardForeground', label: 'Card Text', type: 'hsl', category: 'Surfaces', cssVar: '--card-foreground' },
  { key: 'popover', label: 'Popover Background', type: 'hsl', category: 'Surfaces', cssVar: '--popover' },
  { key: 'popoverForeground', label: 'Popover Text', type: 'hsl', category: 'Surfaces', cssVar: '--popover-foreground' },
  { key: 'muted', label: 'Muted Background', type: 'hsl', category: 'Surfaces', cssVar: '--muted' },
  { key: 'mutedForeground', label: 'Muted Text (token)', type: 'hsl', category: 'Surfaces', cssVar: '--muted-foreground' },
  { key: 'accent', label: 'Accent', type: 'hsl', category: 'Surfaces', cssVar: '--accent' },
  { key: 'accentForeground', label: 'Accent Text', type: 'hsl', category: 'Surfaces', cssVar: '--accent-foreground' },
  { key: 'destructive', label: 'Destructive', type: 'hsl', category: 'Surfaces', cssVar: '--destructive' },
  { key: 'destructiveForeground', label: 'Destructive Text', type: 'hsl', category: 'Surfaces', cssVar: '--destructive-foreground' },
  { key: 'border', label: 'Border (token)', type: 'hsl', category: 'Surfaces', cssVar: '--border' },
  { key: 'input', label: 'Input Border (token)', type: 'hsl', category: 'Surfaces', cssVar: '--input' },
  { key: 'ring', label: 'Focus Ring', type: 'hsl', category: 'Surfaces', cssVar: '--ring' },
  { key: 'radius', label: 'Radius (token)', type: 'text', category: 'Surfaces', cssVar: '--radius' },
  { key: 'navLinkColor', label: 'Nav Link Color', type: 'color', category: 'Navigation', cssVar: '--nav-link' },
  { key: 'navLinkHoverColor', label: 'Nav Link Hover Color', type: 'color', category: 'Navigation', cssVar: '--nav-link-hover' },
  { key: 'navLinkActiveColor', label: 'Nav Link Active Color', type: 'color', category: 'Navigation', cssVar: '--nav-link-active' },
  { key: 'fontFamily', label: 'Font Family', type: 'text', category: 'Typography', cssVar: '--font-family' },
  { key: 'borderRadius', label: 'Layout Border Radius', type: 'text', category: 'Typography', cssVar: '--border-radius' },
  { key: 'spacing', label: 'Base Spacing', type: 'text', category: 'Typography', cssVar: '--spacing' },
  { key: 'primaryTitleColor', label: 'Heading Color', type: 'color', category: 'Content', cssVar: '--heading' },
  { key: 'secondaryTextColor', label: 'Body Text Color', type: 'color', category: 'Content', cssVar: '--body' },
  { key: 'linkAccentColor', label: 'Link Color', type: 'color', category: 'Content', cssVar: '--link' },
  { key: 'mutedTextColor', label: 'Muted Text Color', type: 'color', category: 'Content', cssVar: '--muted-text' },
  { key: 'primaryButtonBg', label: 'Primary Button Background', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-primary-bg' },
  { key: 'primaryButtonHover', label: 'Primary Button Hover', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-primary-hover' },
  { key: 'primaryButtonText', label: 'Primary Button Text', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-primary-text' },
  { key: 'secondaryButtonBg', label: 'Secondary Button Background', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-secondary-bg' },
  { key: 'secondaryButtonHover', label: 'Secondary Button Hover', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-secondary-hover' },
  { key: 'secondaryButtonText', label: 'Secondary Button Text', type: 'color', category: 'Buttons & inputs', cssVar: '--btn-secondary-text' },
  { key: 'cardBgDefault', label: 'Card Background (hex)', type: 'color', category: 'Buttons & inputs', cssVar: '--card-bg' },
  { key: 'cardBgHover', label: 'Card Hover Background', type: 'color', category: 'Buttons & inputs', cssVar: '--card-hover' },
  { key: 'inputBorderColor', label: 'Input Border (hex)', type: 'color', category: 'Buttons & inputs', cssVar: '--input-border' },
  { key: 'backgroundOpacity', label: 'Background Opacity', type: 'number', category: 'Background', cssVar: '--bg-opacity' },
  { key: 'backgroundImage', label: 'Background Image URL', type: 'text', category: 'Background', cssVar: '--bg-image' },
  { key: 'logoImage', label: 'Logo Image URL', type: 'text', category: 'Branding', cssVar: '--logo-image' },
  { key: 'faviconImage', label: 'Favicon URL', type: 'text', category: 'Branding', cssVar: '--favicon-image' },
];

const DEFAULT_SETTINGS: ThemeSettings = {
  ...LAYOUT_THEME_DEFAULTS,
};

interface SelectedElement {
  element: HTMLElement;
  type: 'text' | 'component' | 'icon';
  componentType?: string;
  originalText?: string;
  selector?: string;
}

export function VisualEditor({
  hideControls = false,
  initialPanel = 'theme',
}: {
  hideControls?: boolean;
  initialPanel?: SiteEditorPanel;
}) {
  const [allPages, setAllPages] = useState(AVAILABLE_PAGES);
  const [selectedPage, setSelectedPage] = useState(AVAILABLE_PAGES[0]);
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [panel, setPanel] = useState<SiteEditorPanel>(initialPanel);
  const [isEditing, setIsEditing] = useState(false);
  const [elementStyles, setElementStyles] = useState<Record<string, string>>({});
  const [elementTextContent, setElementTextContent] = useState<string>('');
  const [elementIcon, setElementIcon] = useState<string>('');
  const [pendingEdits, setPendingEdits] = useState<Map<string, ElementEdit>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const [visualRes, globalRes] = await Promise.all([
          fetch(backendApi('admin/theme?mode=visual'), { credentials: 'include', headers }),
          fetch(backendApi('admin/theme?mode=global'), { credentials: 'include', headers }),
        ]);
        const globalData = globalRes.ok ? await globalRes.json() : {};
        const visualData = visualRes.ok ? await visualRes.json() : {};
        if (globalRes.ok || visualRes.ok) {
          const merged = { ...DEFAULT_SETTINGS, ...globalData, ...visualData };
          setSettings(merged);
          setOriginalSettings(merged);
          setSettingsReady(true);
        }
      } catch (error) {
        console.error('Error fetching theme settings:', error);
      }
    };

    const fetchCustomPages = async () => {
      try {
        const t = getAuthToken();
        const h: Record<string, string> = { Accept: 'application/json' };
        if (t) h['Authorization'] = `Bearer ${t}`;
        const response = await fetch(backendApi('admin/server-pages'), { credentials: 'include', headers: h });
        if (response.ok) {
          const pages = await response.json();
          const customPages = mapCustomServerPages(pages);
          setAllPages(mergeThemeEditorPages(customPages));
        }
      } catch (error) {
        console.error('Error fetching custom pages:', error);
      }
    };

    const fetchElementEdits = async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(backendApi('admin/page-elements'), { credentials: 'include', headers });
        if (!response.ok) return;
        const list = await response.json() as ElementEdit[];
        const map = new Map<string, ElementEdit>();
        list.forEach((edit: ElementEdit) => {
          const key = edit.id ?? `${edit.pageSlug}_${edit.selector}`;
          map.set(key, edit);
        });
        setPendingEdits(map);
      } catch (error) {
        console.error('Error fetching element edits:', error);
      }
    };

    fetchSettings();
    fetchCustomPages();
    fetchElementEdits();
  }, []);

  const attachClickHandlers = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;

    const handleIframeClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const iframeEl = iframeRef.current;
      if (!iframeEl?.contentDocument) return;

      let target = e.target as HTMLElement;
      if (!target) return;

      if (target.tagName === 'A' || target.closest('a')) {
        e.preventDefault();
      }

      target = findBestSelectableElement(target);

      if (!isSelectableElement(target)) {
        toast.info('This element is not selectable');
        return;
      }

      if (!iframeEl?.contentDocument) return;

      iframeEl.contentDocument.querySelectorAll('.editor-selected, .editor-group-selected').forEach(el => {
        el.classList.remove('editor-selected', 'editor-group-selected');
      });

      const canEditText = isTextEditable(target);
      const componentType = getComponentType(target);
      const selector = generateSelector(target, e.shiftKey);

      const isGroupSelection = selector.startsWith('.');
      if (isGroupSelection) {
        const matchedElements = iframeEl.contentDocument.querySelectorAll(selector);
        matchedElements.forEach(el => el.classList.add('editor-group-selected'));
        const count = matchedElements.length;
        toast.success(`Selecting ${count} elements as a group`);
      } else {
        target.classList.add('editor-selected');
      }

      const computedStyle = iframeEl.contentWindow?.getComputedStyle(target);
      const currentStyles: Record<string, string> = {};

      currentStyles.backgroundColor = rgbToHex(computedStyle?.backgroundColor || '');
      currentStyles.color = rgbToHex(computedStyle?.color || '');
      currentStyles.borderColor = rgbToHex(computedStyle?.borderColor || '');

      if (componentType === 'button') {
        currentStyles.borderRadius = computedStyle?.borderRadius || '';
        currentStyles.padding = computedStyle?.padding || '';
      } else if (componentType === 'card') {
        currentStyles.boxShadow = computedStyle?.boxShadow || '';
      } else if (componentType === 'heading' || componentType === 'paragraph') {
        currentStyles.fontSize = computedStyle?.fontSize || '';
        currentStyles.fontWeight = computedStyle?.fontWeight || '';
        currentStyles.lineHeight = computedStyle?.lineHeight || '';
      } else {
        currentStyles.width = computedStyle?.width || '';
        currentStyles.height = computedStyle?.height || '';
        currentStyles.margin = computedStyle?.margin || '';
        currentStyles.padding = computedStyle?.padding || '';
      }

      setElementStyles(currentStyles);

      const originalText = canEditText ? target.textContent || '' : '';
      setElementTextContent(originalText);

      const isIcon = isIconElement(target) || componentType === 'icon';
      let currentIcon = '';
      
      setElementIcon(currentIcon);

      setSelectedElement({
        element: target,
        type: canEditText ? 'text' : (isIcon ? 'icon' : 'component'),
        componentType,
        selector,
        originalText: originalText
      });
    };

    doc.addEventListener('click', (e) => {
      if (e.button === 0) {
        handleIframeClick(e as MouseEvent);
      }
    }, true);

    doc.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const leftClickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: doc.defaultView,
        clientX: e.clientX,
        clientY: e.clientY,
        button: 0
      });
      e.target?.dispatchEvent(leftClickEvent);
    }, true);

    const style = doc.createElement('style');
    style.id = 'editor-styles';
    style.textContent = `
      * {
        cursor: default !important;
      }
      .editor-selected {
        outline: 2px solid #52525b !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      .editor-group-selected {
        outline: 2px solid #10b981 !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      .editor-editable {
        outline: 1px dashed #52525b !important;
        outline-offset: 1px !important;
      }
      [contenteditable="true"] {
        outline: 2px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.1) !important;
      }
    `;
    if (!doc.getElementById('editor-styles')) {
      appendStyleToIframeDocument(doc, style);
    }
  }, []);

  const applyStyleToElementAndChildren = (element: HTMLElement, styleProp: string, value: string) => {
    const cssProp = styleProp.replace(/([A-Z])/g, '-$1').toLowerCase();
    
    element.style.setProperty(cssProp, value, 'important');
    
    if (styleProp === 'color' || styleProp === 'backgroundColor' || styleProp === 'borderColor') {
      if (styleProp === 'color') {
        element.classList.remove('text-gray-500', 'text-gray-400', 'text-gray-300', 'text-gray-200', 
          'text-gray-100', 'text-white', 'text-black', 'text-green-500', 'text-zinc-500', 
          'text-red-500', 'text-yellow-500', 'text-purple-500', 'text-pink-500', 'text-indigo-500',
          'text-[#9cff1e]', 'text-[#22c55e]', 'text-[#ef4444]');
      }
      if (styleProp === 'backgroundColor') {
        element.classList.remove('bg-gray-500', 'bg-gray-400', 'bg-gray-300', 'bg-gray-200', 
          'bg-gray-100', 'bg-white', 'bg-black', 'bg-green-500', 'bg-zinc-500', 
          'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
          'bg-[#9cff1e]', 'bg-[#22c55e]', 'bg-[#ef4444]');
      }
      if (styleProp === 'borderColor') {
        const classesToRemove: string[] = [];
        element.classList.forEach(className => {
          if (className.startsWith('border-') && (
            className.includes('gray') || 
            className.includes('green') || 
            className.includes('blue') || 
            className.includes('red') || 
            className.includes('yellow') || 
            className.includes('purple') || 
            className.includes('pink') || 
            className.includes('indigo') ||
            className.includes('white') ||
            className.includes('black') ||
            className.startsWith('border-[#') ||
            className.startsWith('border-[')
          )) {
            classesToRemove.push(className);
          }
        });
        classesToRemove.forEach(cls => element.classList.remove(cls));
      }
    }
    
    if (styleProp === 'color') {
      const svgElements = element.querySelectorAll('svg');
      svgElements.forEach(svg => {
        const svgEl = svg as unknown as SVGElement;
        svgEl.style.setProperty('fill', value, 'important');
        svgEl.style.setProperty('color', value, 'important');
        
        const svgChildren = svg.querySelectorAll('path, circle, rect, ellipse, polygon, polyline, line');
        svgChildren.forEach(child => {
          const svgChild = child as unknown as SVGElement;
          const fillAttr = svgChild.getAttribute('fill');
          const strokeAttr = svgChild.getAttribute('stroke');
          
          if (fillAttr === 'currentColor' || !fillAttr) {
            svgChild.style.setProperty('fill', value, 'important');
          }
          if (strokeAttr === 'currentColor' || (!strokeAttr && svgChild.tagName === 'line')) {
            svgChild.style.setProperty('stroke', value, 'important');
          }
        });
      });
      
      if (element.tagName === 'SVG') {
        const svgEl = element as unknown as SVGElement;
        svgEl.style.setProperty('fill', value, 'important');
        const svgChildren = element.querySelectorAll('path, circle, rect, ellipse, polygon, polyline, line');
        svgChildren.forEach(child => {
          const svgChild = child as unknown as SVGElement;
          const fillAttr = svgChild.getAttribute('fill');
          if (fillAttr === 'currentColor' || !fillAttr) {
            svgChild.style.setProperty('fill', value, 'important');
          }
        });
      }
    }
    
    const children = Array.from(element.children) as HTMLElement[];
    children.forEach(child => {
      if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'NOSCRIPT') {
        applyStyleToElementAndChildren(child, styleProp, value);
      }
    });
  };

  const handleStyleChange = (styleProp: string, value: string) => {
    if (!selectedElement?.element || !selectedElement.selector) return;

    const el = selectedElement.element;
    
    applyStyleToElementAndChildren(el, styleProp, value);

    const editKey = `${selectedPage.slug}_${selectedElement.selector}`;
    const existingEdit = pendingEdits.get(editKey);

    const updatedStyles = {
      ...(existingEdit?.styles || {}),
      [styleProp]: value
    };

    const edit: ElementEdit = {
      id: editKey,
      pageSlug: selectedPage.slug,
      selector: selectedElement.selector,
      editType: existingEdit?.editType === 'text' || existingEdit?.content ? 'text' : 'style',
      content: existingEdit?.content || undefined,
      styles: updatedStyles
    };

    setPendingEdits(prev => {
      const newMap = new Map(prev);
      newMap.set(editKey, edit);
      return newMap;
    });

    setElementStyles(prev => ({ ...prev, [styleProp]: value }));
    setHasUnsavedChanges(true);

    applyPendingEditsToIframe();
  };

  const handleTextContentChange = (newText: string) => {
    if (!selectedElement?.element || !selectedElement.selector) return;

    setElementTextContent(newText);

    const editKey = `${selectedPage.slug}_${selectedElement.selector}`;
    const existingEdit = pendingEdits.get(editKey);

    const edit: ElementEdit = {
      id: editKey,
      pageSlug: selectedPage.slug,
      selector: selectedElement.selector,
      editType: 'text',
      content: newText,
      styles: existingEdit?.styles || undefined
    };

    setPendingEdits(prev => {
      const newMap = new Map(prev);
      newMap.set(editKey, edit);
      return newMap;
    });

    setHasUnsavedChanges(true);

    const iframe = iframeRef.current;
    if (iframe?.contentDocument) {
      const matchedElements = iframe.contentDocument.querySelectorAll(selectedElement.selector);
      matchedElements.forEach(el => {
        (el as HTMLElement).textContent = newText;
      });
    }

    applyPendingEditsToIframe();
  };

  const injectIconSvg = (element: HTMLElement, iconName: string, iframeDoc?: Document): void => {
    const iconMap: Record<string, any> = {
      Home, User, Settings, Search, Heart, Star, Bell, Mail, Calendar,
      Clock, Check, X: XIcon, Plus, Minus, ArrowRight, ArrowLeft,
      ChevronDown, ChevronUp, Menu, MoreVertical, Download, Upload,
      Edit, Trash, Eye: EyeIcon, Lock, Unlock, Play, Pause,
      Volume2, VolumeX, Image, File, Folder, Link: LinkIcon,
    };

    const IconComponent = iconMap[iconName];
    if (!IconComponent) return;

    let svgElement: SVGElement | null = null;
    let targetElement = element;
    
    if (element.tagName === 'SVG') {
      svgElement = element as unknown as SVGElement;
    } else {
      svgElement = element.querySelector('svg');
      if (!svgElement && element.parentElement?.tagName === 'SVG') {
        svgElement = element.parentElement as unknown as SVGElement;
        targetElement = element.parentElement;
      }
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    document.body.appendChild(tempContainer);

    try {
      import('react-dom/client').then(({ createRoot }) => {
        const iconElement = React.createElement(IconComponent, {
          className: 'lucide lucide-' + iconName.toLowerCase(),
          width: 24,
          height: 24
        });

        const root = createRoot(tempContainer);
        root.render(iconElement);

        setTimeout(() => {
          const renderedSvg = tempContainer.querySelector('svg');
          if (renderedSvg) {
            const doc = iframeDoc || document;
            
            const clonedSvg = renderedSvg.cloneNode(true) as SVGElement;
            
            if (svgElement && svgElement.ownerDocument === (iframeDoc || document)) {
              const existingClasses = Array.from(svgElement.classList).filter(c => !c.startsWith('editor-'));
              const existingStyle = svgElement.getAttribute('style');
              
              svgElement.innerHTML = clonedSvg.innerHTML;
              
              Array.from(clonedSvg.attributes).forEach(attr => {
                if (attr.name !== 'class') {
                  svgElement!.setAttribute(attr.name, attr.value);
                }
              });
              
              existingClasses.forEach(c => svgElement!.classList.add(c));
              if (existingStyle) {
                svgElement!.setAttribute('style', existingStyle);
              }
            } else {
              const newSvg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
              newSvg.innerHTML = clonedSvg.innerHTML;
              Array.from(clonedSvg.attributes).forEach(attr => {
                newSvg.setAttribute(attr.name, attr.value);
              });
              
              if (targetElement.className) {
                const classes = Array.from(targetElement.classList).filter(c => !c.startsWith('editor-'));
                classes.forEach(c => newSvg.classList.add(c));
              }
              
              targetElement.innerHTML = '';
              targetElement.appendChild(newSvg);
            }
          }
          
          root.unmount();
          document.body.removeChild(tempContainer);
        }, 10);
      }).catch((e) => {
        console.error('Error rendering icon:', e);
        document.body.removeChild(tempContainer);
      });
    } catch (e) {
      console.error('Error setting up icon injection:', e);
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handleIconChange = (newIcon: string) => {
    if (!selectedElement?.element || !selectedElement.selector) return;

    setElementIcon(newIcon);

    const elementDoc = selectedElement.element.ownerDocument;
    const iframeDoc = elementDoc !== document ? elementDoc : undefined;

    injectIconSvg(selectedElement.element, newIcon, iframeDoc);

    const iframe = iframeRef.current;
    if (iframe?.contentDocument && iframe.contentDocument !== document) {
      const matchedElements = iframe.contentDocument.querySelectorAll(selectedElement.selector);
      matchedElements.forEach(el => {
        injectIconSvg(el as HTMLElement, newIcon, iframe.contentDocument || undefined);
      });
    }

    const editKey = `${selectedPage.slug}_${selectedElement.selector}`;
    const existingEdit = pendingEdits.get(editKey);

    const edit: ElementEdit = {
      id: editKey,
      pageSlug: selectedPage.slug,
      selector: selectedElement.selector,
      editType: 'icon',
      icon: newIcon,
      styles: existingEdit?.styles || undefined,
      content: existingEdit?.content || undefined
    };

    setPendingEdits(prev => {
      const newMap = new Map(prev);
      newMap.set(editKey, edit);
      return newMap;
    });

    setHasUnsavedChanges(true);
    applyPendingEditsToIframe();
  };


  const handleRemoveElement = () => {
    if (!selectedElement?.element || !selectedElement.selector) return;

    const elementDoc = selectedElement.element.ownerDocument;
    if (!elementDoc) return;

    const matchedElements = elementDoc.querySelectorAll(selectedElement.selector);
    matchedElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    const editKey = `${selectedPage.slug}_${selectedElement.selector}`;
    const existingEdit = pendingEdits.get(editKey);

    const updatedStyles = {
      ...(existingEdit?.styles || {}),
      display: 'none'
    };

    const edit: ElementEdit = {
      id: editKey,
      pageSlug: selectedPage.slug,
      selector: selectedElement.selector,
      editType: 'style',
      styles: updatedStyles
    };

    setPendingEdits(prev => {
      const newMap = new Map(prev);
      newMap.set(editKey, edit);
      return newMap;
    });

    setElementStyles(prev => ({ ...prev, display: 'none' }));
    setHasUnsavedChanges(true);

    applyPendingEditsToIframe();
    
    const dialogIframe = elementDoc.defaultView?.frameElement as HTMLIFrameElement;
    if (dialogIframe && dialogIframe.contentDocument) {
      const dialogMatchedElements = dialogIframe.contentDocument.querySelectorAll(selectedElement.selector);
      dialogMatchedElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    }

    elementDoc.querySelectorAll('.editor-selected, .editor-group-selected').forEach(el => {
      el.classList.remove('editor-selected', 'editor-group-selected');
    });
    
    if (iframeRef.current?.contentDocument && iframeRef.current.contentDocument !== elementDoc) {
      iframeRef.current.contentDocument.querySelectorAll('.editor-selected, .editor-group-selected').forEach(el => {
        el.classList.remove('editor-selected', 'editor-group-selected');
      });
    }
    
    setSelectedElement(null);
    
    toast.success(`Removed ${matchedElements.length} element(s). Remember to save your changes.`);
  };

  const applyPendingEditsToIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const editsForPage = Array.from(pendingEdits.values()).filter(
      (edit) => edit.pageSlug === selectedPage.slug
    );

    let style = iframe.contentDocument.getElementById('pending-edits') as HTMLStyleElement;
    if (!style) {
      style = iframe.contentDocument.createElement('style');
      style.id = 'pending-edits';
      if (!appendStyleToIframeDocument(iframe.contentDocument, style)) return;
    }

    let css = buildDraftEditsCss(selectedPage.slug, pendingEdits);
    editsForPage.forEach(edit => {
      if (iframe.contentDocument && edit.styles) {
          const matchedElements = iframe.contentDocument.querySelectorAll(edit.selector);
          matchedElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            if (edit.styles?.color) {
              htmlEl.classList.remove('text-gray-500', 'text-gray-400', 'text-gray-300', 'text-gray-200', 
                'text-gray-100', 'text-white', 'text-black', 'text-green-500', 'text-zinc-500', 
                'text-red-500', 'text-yellow-500', 'text-purple-500', 'text-pink-500', 'text-indigo-500',
                'text-[#9cff1e]', 'text-[#22c55e]', 'text-[#ef4444]');
            }
            if (edit.styles?.backgroundColor) {
              htmlEl.classList.remove('bg-gray-500', 'bg-gray-400', 'bg-gray-300', 'bg-gray-200', 
                'bg-gray-100', 'bg-white', 'bg-black', 'bg-green-500', 'bg-zinc-500', 
                'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
                'bg-[#9cff1e]', 'bg-[#22c55e]', 'bg-[#ef4444]');
            }
            if (edit.styles?.borderColor) {
              const classesToRemove: string[] = [];
              htmlEl.classList.forEach(className => {
                if (className.startsWith('border-') && (
                  className.includes('gray') || 
                  className.includes('green') || 
                  className.includes('blue') || 
                  className.includes('red') || 
                  className.includes('yellow') || 
                  className.includes('purple') || 
                  className.includes('pink') || 
                  className.includes('indigo') ||
                  className.includes('white') ||
                  className.includes('black') ||
                  className.startsWith('border-[#') ||
                  className.startsWith('border-[')
                )) {
                  classesToRemove.push(className);
                }
              });
              classesToRemove.forEach(cls => htmlEl.classList.remove(cls));
            }
            
            const allChildren = htmlEl.querySelectorAll('*');
            allChildren.forEach(child => {
              const childEl = child as HTMLElement;
              if (edit.styles?.color) {
                childEl.classList.remove('text-gray-500', 'text-gray-400', 'text-gray-300', 'text-gray-200', 
                  'text-gray-100', 'text-white', 'text-black', 'text-green-500', 'text-zinc-500', 
                  'text-red-500', 'text-yellow-500', 'text-purple-500', 'text-pink-500', 'text-indigo-500',
                  'text-[#9cff1e]', 'text-[#22c55e]', 'text-[#ef4444]');
              }
              if (edit.styles?.backgroundColor) {
                childEl.classList.remove('bg-gray-500', 'bg-gray-400', 'bg-gray-300', 'bg-gray-200', 
                  'bg-gray-100', 'bg-white', 'bg-black', 'bg-green-500', 'bg-zinc-500', 
                  'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
                  'bg-[#9cff1e]', 'bg-[#22c55e]', 'bg-[#ef4444]');
              }
              if (edit.styles?.borderColor) {
                const classesToRemove: string[] = [];
                childEl.classList.forEach(className => {
                  if (className.startsWith('border-') && (
                    className.includes('gray') || 
                    className.includes('green') || 
                    className.includes('blue') || 
                    className.includes('red') || 
                    className.includes('yellow') || 
                    className.includes('purple') || 
                    className.includes('pink') || 
                    className.includes('indigo') ||
                    className.includes('white') ||
                    className.includes('black') ||
                    className.startsWith('border-[#') ||
                    className.startsWith('border-[')
                  )) {
                    classesToRemove.push(className);
                  }
                });
                classesToRemove.forEach(cls => childEl.classList.remove(cls));
              }
            });
          });
      }

      if (edit.content !== undefined && iframe.contentDocument) {
        const matchedElements = iframe.contentDocument.querySelectorAll(edit.selector);
        matchedElements.forEach(el => {
          (el as HTMLElement).textContent = edit.content || '';
        });
      }

      if (edit.icon !== undefined && iframe.contentDocument) {
        const matchedElements = iframe.contentDocument.querySelectorAll(edit.selector);
        matchedElements.forEach(el => {
          const htmlEl = el as HTMLElement;
          injectIconSvg(htmlEl, edit.icon!, iframe.contentDocument || undefined);
        });
      }
    });

    style.textContent = css;
  };

  const applyThemeToIframe = useCallback((doc?: Document | null) => {
    const iframeDoc = doc ?? iframeRef.current?.contentDocument;
    if (!iframeDoc || !settingsReady) return;

    let style = iframeDoc.getElementById('theme-override') as HTMLStyleElement | null;
    const dirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    if (!dirty) {
      if (style) style.textContent = '';
      return;
    }

    if (!style) {
      style = iframeDoc.createElement('style');
      style.id = 'theme-override';
      if (!appendStyleToIframeDocument(iframeDoc, style)) return;
    }

    style.textContent = buildSiteThemeCss(settings);
    applyLayoutThemeMedia(iframeDoc, settings);
  }, [settings, originalSettings, settingsReady]);

  useEffect(() => {
    if (iframeRef.current?.contentDocument) {
      applyThemeToIframe();
    }
  }, [settings, applyThemeToIframe]);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.onload = () => {
        applyThemeToIframe();
        applyPendingEditsToIframe();
        attachClickHandlers();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyPendingEditsToIframe intentionally omitted to avoid re-running on every edit
  }, [selectedPage, applyThemeToIframe, attachClickHandlers]);

  useEffect(() => {
    if (iframeRef.current?.contentDocument && pendingEdits.size > 0) {
      applyPendingEditsToIframe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyPendingEditsToIframe intentionally omitted to avoid stale closure
  }, [pendingEdits]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const themeResponse = await fetch(backendApi('admin/theme?mode=visual'), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(settings),
      });

      if (!themeResponse.ok) throw new Error('Failed to save theme settings');

      const savedTheme = await themeResponse.json();
      persistTheme(savedTheme);

      if (pendingEdits.size > 0) {
        const editsArray = Array.from(pendingEdits.values());
        const savePromises = editsArray.map(edit =>
          fetch(backendApi('admin/page-elements'), {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(edit),
          })
        );

        const results = await Promise.all(savePromises);
        const failedSaves = results.filter(r => !r.ok);

        if (failedSaves.length > 0) {
          toast.error(`Failed to save ${failedSaves.length} element edit(s)`);
        } else {
          toast.success(`Saved ${editsArray.length} element edit(s)`);
          setPendingEdits(new Map());
          setHasUnsavedChanges(false);
        }
      }

      toast.success('Theme settings saved successfully');
      setOriginalSettings(settings);
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setPendingEdits(new Map());
    setHasUnsavedChanges(false);
    toast.info('Reset to saved settings');
  };

  const handleResetToDefault = async () => {
    try {
      setIsSaving(true);
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });

      const resetResponse = await fetch(backendApi('admin/theme?mode=visual'), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ ...DEFAULT_SETTINGS, enabled: settings.enabled }),
      });

      if (!resetResponse.ok) throw new Error('Failed to reset theme');

      const resetTheme = await resetResponse.json();
      persistTheme(resetTheme);

      const clearEditsResponse = await fetch(backendApi('admin/page-elements/clear'), {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (!clearEditsResponse.ok) {
        console.warn('Failed to clear element edits');
      }

      setSettings({ ...DEFAULT_SETTINGS, enabled: settings.enabled });
      setOriginalSettings({ ...DEFAULT_SETTINGS, enabled: settings.enabled });
      setPendingEdits(new Map());
      setHasUnsavedChanges(false);

      toast.success('Theme reset to default settings');

      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (error) {
      toast.error('Failed to reset theme');
      console.error('Error resetting theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof ThemeSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const hexToHsl = (hex: string): string => {
    if (!hex) return '';

    if (hex.startsWith('rgba')) {
      const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        hex = `#${r}${g}${b}`;
      }
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const hslToHex = (hsl: string): string => {
    if (!hsl || typeof hsl !== 'string') return '#000000';
    const parts = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
    if (!parts) return '#000000';

    let h = parseFloat(parts[1]) / 360;
    let s = parseFloat(parts[2]) / 100;
    let l = parseFloat(parts[3]) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const updateColorFromPicker = (key: keyof ThemeSettings, hex: string) => {
    const hsl = hexToHsl(hex);
    setSettings(prev => ({ ...prev, [key]: hsl }));
  };

  const getComponentOptions = () => {
    if (!selectedElement) return null;

    const { componentType } = selectedElement;

    switch (componentType) {
      case 'button':
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Background Color"
              value={elementStyles.backgroundColor || '#000000'}
              onChange={(value) => handleStyleChange('backgroundColor', value)}
            />
            <ColorPicker
              label="Text Color"
              value={elementStyles.color || '#000000'}
              onChange={(value) => handleStyleChange('color', value)}
            />
            <div className="space-y-2">
              <Label className="text-xs">Border Radius</Label>
              <Input
                type="text"
                value={elementStyles.borderRadius || ''}
                onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                placeholder="e.g., 0.5rem"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Padding</Label>
              <Input
                type="text"
                value={elementStyles.padding || ''}
                onChange={(e) => handleStyleChange('padding', e.target.value)}
                placeholder="e.g., 0.5rem 1rem"
                className="text-xs"
              />
            </div>
          </div>
        );
      case 'card':
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Background Color"
              value={elementStyles.backgroundColor || '#000000'}
              onChange={(value) => handleStyleChange('backgroundColor', value)}
            />
            <ColorPicker
              label="Text Color"
              value={elementStyles.color || '#000000'}
              onChange={(value) => handleStyleChange('color', value)}
            />
            <ColorPicker
              label="Border Color"
              value={elementStyles.borderColor || '#000000'}
              onChange={(value) => handleStyleChange('borderColor', value)}
            />
            <div className="space-y-2">
              <Label className="text-xs">Shadow</Label>
              <Input
                type="text"
                value={elementStyles.boxShadow || ''}
                onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
                placeholder="e.g., 0 1px 3px rgba(0,0,0,0.1)"
                className="text-xs"
              />
            </div>
          </div>
        );
      case 'heading':
      case 'paragraph':
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Background Color"
              value={elementStyles.backgroundColor || '#000000'}
              onChange={(value) => handleStyleChange('backgroundColor', value)}
            />
            <ColorPicker
              label="Text Color"
              value={elementStyles.color || '#000000'}
              onChange={(value) => handleStyleChange('color', value)}
            />
            <div className="space-y-2">
              <Label className="text-xs">Font Size</Label>
              <Input
                type="text"
                value={elementStyles.fontSize || ''}
                onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                placeholder="e.g., 1.5rem"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Font Weight</Label>
              <Input
                type="text"
                value={elementStyles.fontWeight || ''}
                onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                placeholder="e.g., 600"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Line Height</Label>
              <Input
                type="text"
                value={elementStyles.lineHeight || ''}
                onChange={(e) => handleStyleChange('lineHeight', e.target.value)}
                placeholder="e.g., 1.5"
                className="text-xs"
              />
            </div>
          </div>
        );
      case 'icon':
        const commonIcons = [
          { name: 'Home', component: Home },
          { name: 'User', component: User },
          { name: 'Settings', component: Settings },
          { name: 'Search', component: Search },
          { name: 'Heart', component: Heart },
          { name: 'Star', component: Star },
          { name: 'Bell', component: Bell },
          { name: 'Mail', component: Mail },
          { name: 'Calendar', component: Calendar },
          { name: 'Clock', component: Clock },
          { name: 'Check', component: Check },
          { name: 'X', component: XIcon },
          { name: 'Plus', component: Plus },
          { name: 'Minus', component: Minus },
          { name: 'ArrowRight', component: ArrowRight },
          { name: 'ArrowLeft', component: ArrowLeft },
          { name: 'ChevronDown', component: ChevronDown },
          { name: 'ChevronUp', component: ChevronUp },
          { name: 'Menu', component: Menu },
          { name: 'MoreVertical', component: MoreVertical },
          { name: 'Download', component: Download },
          { name: 'Upload', component: Upload },
          { name: 'Edit', component: Edit },
          { name: 'Trash', component: Trash },
          { name: 'Eye', component: EyeIcon },
          { name: 'Lock', component: Lock },
          { name: 'Unlock', component: Unlock },
          { name: 'Play', component: Play },
          { name: 'Pause', component: Pause },
          { name: 'Volume2', component: Volume2 },
          { name: 'VolumeX', component: VolumeX },
          { name: 'Image', component: Image },
          { name: 'File', component: File },
          { name: 'Folder', component: Folder },
          { name: 'Link', component: LinkIcon },
        ];
        
        return (
          <div className="space-y-4">
            <div className="space-y-2 pb-4 border-b">
              <Label className="text-sm font-medium">Replace Icon</Label>
              <Select value={elementIcon || 'none'} onValueChange={(value) => value !== 'none' && handleIconChange(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon to replace" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">Keep Current Icon</SelectItem>
                  {commonIcons.map((icon) => {
                    const IconComp = icon.component;
                    return (
                      <SelectItem key={icon.name} value={icon.name}>
                        <div className="flex items-center gap-2">
                          <IconComp className="h-4 w-4" />
                          <span>{icon.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select an icon to replace the current one. The icon will be updated immediately.
              </p>
            </div>
            <ColorPicker
              label="Icon Color"
              value={elementStyles.color || '#000000'}
              onChange={(value) => handleStyleChange('color', value)}
            />
            <div className="space-y-2">
              <Label className="text-xs">Icon Size</Label>
              <Input
                type="text"
                value={elementStyles.width || elementStyles.height || ''}
                onChange={(e) => {
                  handleStyleChange('width', e.target.value);
                  handleStyleChange('height', e.target.value);
                }}
                placeholder="e.g., 24px or 1.5rem"
                className="text-xs"
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <ColorPicker
              label="Background Color"
              value={elementStyles.backgroundColor || '#000000'}
              onChange={(value) => handleStyleChange('backgroundColor', value)}
            />
            <ColorPicker
              label="Text Color"
              value={elementStyles.color || '#000000'}
              onChange={(value) => handleStyleChange('color', value)}
            />
            <ColorPicker
              label="Border Color"
              value={elementStyles.borderColor || '#000000'}
              onChange={(value) => handleStyleChange('borderColor', value)}
            />
            <div className="space-y-2">
              <Label className="text-xs">Width</Label>
              <Input
                type="text"
                value={elementStyles.width || ''}
                onChange={(e) => handleStyleChange('width', e.target.value)}
                placeholder="e.g., 100%"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height</Label>
              <Input
                type="text"
                value={elementStyles.height || ''}
                onChange={(e) => handleStyleChange('height', e.target.value)}
                placeholder="e.g., auto"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Margin</Label>
              <Input
                type="text"
                value={elementStyles.margin || ''}
                onChange={(e) => handleStyleChange('margin', e.target.value)}
                placeholder="e.g., 1rem"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Padding</Label>
              <Input
                type="text"
                value={elementStyles.padding || ''}
                onChange={(e) => handleStyleChange('padding', e.target.value)}
                placeholder="e.g., 1rem"
                className="text-xs"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={hideControls ? "flex h-full min-h-0 flex-col gap-3 px-4 pb-4" : "flex h-[calc(100vh-200px)] flex-col gap-4"}>
      {!hideControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ThemeEditorPagePicker pages={allPages} selectedSlug={selectedPage.slug} onSelect={setSelectedPage} />
            <p className="text-xs text-muted-foreground max-w-[220px] leading-snug hidden lg:block">
              Click the preview to select elements. Open the full site to edit in context.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const base = typeof window !== 'undefined' ? window.location.origin : '';
                window.open(`${base}${withThemeEditorQuery(selectedPage.path)}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Edit on the site
            </Button>
            <Button onClick={() => setIframeKey(k => k + 1)} variant="ghost" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to Default Theme?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently reset all theme settings and element customizations to their default values.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefault} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {hideControls && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-sm font-semibold">Site Editor</span>
            <ThemeEditorPagePicker pages={allPages} selectedSlug={selectedPage.slug} onSelect={setSelectedPage} />
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const base = typeof window !== 'undefined' ? window.location.origin : '';
                window.open(`${base}${withThemeEditorQuery(selectedPage.path)}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Edit on the site
            </Button>
            <Button onClick={() => setIframeKey((k) => k + 1)} variant="ghost" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to Default Theme?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently reset all theme settings and element customizations to their default values.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDefault} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
          <div className="bg-muted p-2 flex items-center justify-between border-b">
            <div className="text-sm text-muted-foreground">Preview: {selectedPage.label}</div>
            <div className="flex items-center gap-2">
              {selectedElement && (
                <div className="flex items-center gap-1 text-xs bg-primary/10 px-2 py-1 rounded">
                  {selectedElement.type === 'text' ? <Type className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                  <span className="capitalize">{selectedElement.componentType}</span>
                </div>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[98vw] h-[98vh] p-0 overflow-hidden">
                  <div className="h-full flex overflow-hidden">
                    <div className="flex-1 border-r flex flex-col overflow-hidden">
                      <div className="bg-muted p-2 flex items-center justify-between border-b flex-shrink-0">
                        <div className="flex items-center gap-4">
                          <ThemeEditorPagePicker pages={allPages} selectedSlug={selectedPage.slug} onSelect={setSelectedPage} />
                          {selectedElement && (
                            <div className="flex items-center gap-1 text-xs bg-primary/10 px-2 py-1 rounded">
                              {selectedElement.type === 'text' ? <Type className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                              <span className="capitalize">{selectedElement.componentType}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 border-b border-zinc-500/20 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                        Click the preview to style one element. Hold Shift to pick a child.
                      </div>
                      <iframe
                        key={selectedPage.slug}
                        src={selectedPage.path + '?theme-preview=true'}
                        className="w-full flex-1 border-0 min-h-0"
                        sandbox="allow-same-origin allow-scripts"
                        onLoad={(e) => {
                          const iframe = e.currentTarget;
                          if (!iframe.contentDocument) return;

                          applyThemeToIframe(iframe.contentDocument);
                          let chrome = iframe.contentDocument.getElementById('editor-styles') as HTMLStyleElement | null;
                          if (!chrome) {
                            chrome = iframe.contentDocument.createElement('style');
                            chrome.id = 'editor-styles';
                            if (!appendStyleToIframeDocument(iframe.contentDocument, chrome)) return;
                          }
                          chrome.textContent = `
                            a { pointer-events: none !important; }
                            .editor-selected {
                              outline: 2px solid #52525b !important;
                              outline-offset: 2px !important;
                              cursor: pointer !important;
                            }
                            .editor-group-selected {
                              outline: 2px solid #10b981 !important;
                              outline-offset: 2px !important;
                              cursor: pointer !important;
                            }
                          `;

                          const handleClick = (ev: MouseEvent) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            let target = ev.target as HTMLElement;
                            if (!target) return;

                            target = findBestSelectableElement(target);

                            if (!isSelectableElement(target)) return;

                            iframe.contentDocument?.querySelectorAll('.editor-selected, .editor-group-selected').forEach(el => {
                              el.classList.remove('editor-selected', 'editor-group-selected');
                            });

                            const canEditText = isTextEditable(target);
                            const componentType = getComponentType(target);
                            const selector = generateSelector(target, ev.shiftKey);

                            const isGroupSelection = selector.startsWith('.');
                            if (isGroupSelection) {
                              const matchedElements = iframe.contentDocument?.querySelectorAll(selector);
                              matchedElements?.forEach(el => el.classList.add('editor-group-selected'));
                            } else {
                              target.classList.add('editor-selected');
                            }

                            const computedStyle = iframe.contentWindow?.getComputedStyle(target);
                            const currentStyles: Record<string, string> = {};

                            currentStyles.backgroundColor = rgbToHex(computedStyle?.backgroundColor || '');
                            currentStyles.color = rgbToHex(computedStyle?.color || '');

                            if (componentType === 'button') {
                              currentStyles.borderRadius = computedStyle?.borderRadius || '';
                              currentStyles.padding = computedStyle?.padding || '';
                            } else if (componentType === 'card') {
                              currentStyles.borderColor = rgbToHex(computedStyle?.borderColor || '');
                              currentStyles.boxShadow = computedStyle?.boxShadow || '';
                            } else if (componentType === 'heading' || componentType === 'paragraph') {
                              currentStyles.fontSize = computedStyle?.fontSize || '';
                              currentStyles.fontWeight = computedStyle?.fontWeight || '';
                              currentStyles.lineHeight = computedStyle?.lineHeight || '';
                            } else {
                              currentStyles.width = computedStyle?.width || '';
                              currentStyles.height = computedStyle?.height || '';
                              currentStyles.margin = computedStyle?.margin || '';
                              currentStyles.padding = computedStyle?.padding || '';
                            }

                            setElementStyles(currentStyles);

                            const originalText = canEditText ? target.textContent || '' : '';
                            setElementTextContent(originalText);

                            const isIcon = isIconElement(target) || componentType === 'icon';
                            let currentIcon = '';
                            
                            setElementIcon(currentIcon);

                            setSelectedElement({
                              element: target,
                              type: canEditText ? 'text' : (isIcon ? 'icon' : 'component'),
                              componentType,
                              selector,
                              originalText: originalText
                            });
                          };

                          iframe.contentDocument.addEventListener('click', handleClick);
                        }}
                      />
                    </div>
                    <div className="w-[400px] bg-background flex flex-col overflow-hidden min-h-0">
                      {selectedElement ? (
                        <div className="flex-shrink-0 border-b p-4">
                          <h3 className="font-semibold">Element Options</h3>
                        </div>
                      ) : null}
                      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
                        {selectedElement ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between pb-4 border-b">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium capitalize">{selectedElement.componentType}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {selectedElement.type === 'text' ? 'Text Element' : 
                                     selectedElement.type === 'icon' ? 'Icon Element' : 'Component'}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedElement(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              {selectedElement.type === 'text' && (
                                <div className="space-y-2 pb-4 border-b">
                                  <Label className="text-sm font-medium">Text Content</Label>
                                  <Textarea
                                    value={elementTextContent}
                                    onChange={(e) => handleTextContentChange(e.target.value)}
                                    placeholder="Enter text content..."
                                    className="text-sm min-h-[100px]"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Edit the text content of this element. Changes will be applied immediately.
                                  </p>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Style Properties</Label>
                                {getComponentOptions()}
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={handleRemoveElement}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Element
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => setSelectedElement(null)}
                              >
                                Back
                              </Button>
                            </div>
                          ) : (
                            <SiteEditorRail
                              panel={panel}
                              onPanel={setPanel}
                              slug={selectedPage.slug}
                              label={selectedPage.label}
                              theme={
                                <ThemePropertyEditor
                                  settings={settings}
                                  hslToHex={hslToHex}
                                  hexToHsl={hexToHsl}
                                  updateSetting={updateSetting}
                                />
                              }
                            />
                          )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="border-b border-zinc-500/20 bg-zinc-500/10 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
            Click the preview to style one element. Hold Shift to pick a child.
          </div>
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={selectedPage.path + '?theme-preview=true'}
            className="min-h-0 w-full flex-1 border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
          {selectedElement ? (
            <div className="flex-shrink-0 border-b p-4">
              <h3 className="font-semibold">Element Options</h3>
            </div>
          ) : null}

          <ScrollArea className="min-h-0 flex-1" type="always">
            <div className="p-4">
              {selectedElement ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="space-y-1">
                      <div className="text-sm font-medium capitalize">{selectedElement.componentType}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedElement.type === 'text' ? 'Text Element' : 'Component'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedElement(null);
                        if (iframeRef.current?.contentDocument) {
                          iframeRef.current.contentDocument.querySelectorAll('.editor-selected').forEach(el => {
                            el.classList.remove('editor-selected');
                          });
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {selectedElement.type === 'text' && (
                    <div className="space-y-2 pb-4 border-b">
                      <Label className="text-sm font-medium">Text Content</Label>
                      <Textarea
                        value={elementTextContent}
                        onChange={(e) => handleTextContentChange(e.target.value)}
                        placeholder="Enter text content..."
                        className="text-sm min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Edit the text content of this element. Changes will be applied immediately.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Style Properties</Label>
                    {getComponentOptions()}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleRemoveElement}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Element
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedElement(null)}
                  >
                    Back
                  </Button>
                </div>
              ) : (
                <SiteEditorRail
                  panel={panel}
                  onPanel={setPanel}
                  slug={selectedPage.slug}
                  label={selectedPage.label}
                  theme={
                    <ThemePropertyEditor
                      settings={settings}
                      hslToHex={hslToHex}
                      hexToHsl={hexToHsl}
                      updateSetting={updateSetting}
                    />
                  }
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

const THEME_CATEGORIES = [...new Set(THEME_PROPERTIES.map((prop) => prop.category))];

function ThemePropertyEditor({
  settings,
  hslToHex,
  hexToHsl,
  updateSetting,
}: {
  settings: ThemeSettings;
  hslToHex: (hsl: string) => string;
  hexToHsl: (hex: string) => string;
  updateSetting: (key: keyof ThemeSettings, value: string | number) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string[]>(['Base Colors', 'Theme Colors']);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!q) return;
    const matched = [
      ...new Set(
        THEME_PROPERTIES.filter(
          (prop) => prop.label.toLowerCase().includes(q) || prop.key.toLowerCase().includes(q),
        ).map((prop) => prop.category),
      ),
    ];
    setOpen(matched);
  }, [q]);

  const groups = THEME_CATEGORIES.map((category) => ({
    category,
    props: THEME_PROPERTIES.filter(
      (prop) =>
        prop.category === category &&
        (!q || prop.label.toLowerCase().includes(q) || prop.key.toLowerCase().includes(q)),
    ),
  })).filter((group) => group.props.length > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Colors and type for the whole site. Copy for the page you are previewing is under This page.
      </p>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search colors and type"
        className="h-8 text-xs"
      />
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matches.</p>
      ) : (
        <Accordion type="multiple" className="w-full" value={open} onValueChange={setOpen}>
          {groups.map((group) => (
            <AccordionItem key={group.category} value={group.category}>
              <AccordionTrigger className="text-sm font-medium">{group.category}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {group.props.map((prop) => {
                    const value = settings[prop.key as keyof ThemeSettings];
                    return (
                      <div key={prop.key} className="space-y-2">
                        <Label className="text-xs">{prop.label}</Label>
                        {prop.type === 'hsl' ? (
                          <ColorPicker
                            value={hslToHex(String(value ?? ''))}
                            onChange={(next) => updateSetting(prop.key as keyof ThemeSettings, hexToHsl(next))}
                          />
                        ) : prop.type === 'color' ? (
                          <ColorPicker
                            value={String(value ?? '')}
                            onChange={(next) => updateSetting(prop.key as keyof ThemeSettings, next)}
                          />
                        ) : prop.type === 'number' ? (
                          <Input
                            type="number"
                            value={typeof value === 'number' ? value : Number(value) || 0}
                            onChange={(e) => updateSetting(prop.key as keyof ThemeSettings, parseFloat(e.target.value) || 0)}
                            className="text-xs"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={value == null ? '' : String(value)}
                            onChange={(e) => updateSetting(prop.key as keyof ThemeSettings, e.target.value)}
                            className="text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
