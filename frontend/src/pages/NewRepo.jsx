import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { toast } from 'sonner';
import { BookMarked, Globe, Lock } from 'lucide-react';

const LANGS = ['Markdown', 'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Shell', 'HTML', 'CSS', 'Java', 'C++'];

const NewRepo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('Public');
  const [initReadme, setInitReadme] = useState(true);
  const [language, setLanguage] = useState('Markdown');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Repository name is required'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/repos', {
        name, description, visibility, language,
        init_readme: initReadme,
      });
      toast.success('Repository created!');
      navigate(`/${data.owner}/${data.name}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <BookMarked className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Create a new repository</h1>
        </div>
        <p className="text-muted-foreground">A repository contains all project files, including the revision history.</p>
        <hr className="my-6 border-border" />

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-3 items-end">
            <div>
              <Label className="text-sm">Owner *</Label>
              <Button type="button" variant="outline" className="mt-1 w-full justify-start border-border">
                <img src={user?.avatar} alt="" className="h-5 w-5 rounded-full mr-2 bg-muted" />
                {user?.username}
              </Button>
            </div>
            <div>
              <Label className="text-sm">Repository name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, '-'))} className="mt-1 bg-card border-border" placeholder="my-awesome-project" />
              {name && <p className="text-xs text-[hsl(var(--brand))] mt-1">Great repository names are short and memorable.</p>}
            </div>
          </div>

          <div>
            <Label className="text-sm">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 bg-card border-border" />
          </div>

          <div>
            <Label className="text-sm">Primary language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1 bg-card border-border max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <hr className="border-border" />

          <RadioGroup value={visibility} onValueChange={setVisibility} className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <RadioGroupItem value="Public" className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-medium"><Globe className="h-4 w-4" /> Public</div>
                <p className="text-sm text-muted-foreground">Anyone on the internet can see this repository.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <RadioGroupItem value="Private" className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4" /> Private</div>
                <p className="text-sm text-muted-foreground">Only you can see this repository.</p>
              </div>
            </label>
          </RadioGroup>

          <hr className="border-border" />

          <div>
            <p className="font-medium mb-2">Initialize this repository with:</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={initReadme} onCheckedChange={setInitReadme} /> Add a README file
            </label>
            <p className="text-xs text-muted-foreground ml-6">This is where you can write a long description for your project.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" className="border-border" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? 'Creating…' : 'Create repository'}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default NewRepo;
