'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, User, Bell, Shield } from 'lucide-react';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get('/users/me/');
                const user = response.data;
                setName(user.name || 'Default Admin');
                setEmail(user.email || 'admin@example.com');
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        };

        fetchUserData();
    }, []);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
                </div>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground">Profile</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Update your personal information
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter your name"
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button className="bg-muted border-border text-foreground hover:bg-muted/80">
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Section */}
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Shield className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground">Security</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Manage your password and authentication
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password" className="text-sm font-medium text-foreground">Current Password</Label>
                                    <Input 
                                        id="current-password" 
                                        type="password" 
                                        placeholder="Enter current password"
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password" className="text-sm font-medium text-foreground">New Password</Label>
                                    <Input 
                                        id="new-password" 
                                        type="password" 
                                        placeholder="Enter new password"
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                                    <Input 
                                        id="confirm-password" 
                                        type="password" 
                                        placeholder="Confirm new password"
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button className="bg-muted border-border text-foreground hover:bg-muted/80">
                                    Update Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications Section */}
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Bell className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground">Notifications</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Configure how you receive notifications
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-foreground">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive email updates about your projects
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-muted border-border text-foreground hover:bg-muted/80">
                                        Enable
                                    </Button>
                                </div>
                                <Separator className="bg-border" />
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-foreground">Weekly Summary</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Get a weekly digest of activity
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-muted border-border text-foreground hover:bg-muted/80">
                                        Enable
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
