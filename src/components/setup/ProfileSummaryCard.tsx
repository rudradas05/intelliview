import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Target, BookOpen } from "lucide-react";
import type { ResumeProfile } from "@/types/index";

interface ProfileSummaryCardProps {
  profile: ResumeProfile;
  fileName: string;
}

export default function ProfileSummaryCard({
  profile,
  fileName,
}: ProfileSummaryCardProps) {
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Resume Analyzed
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {profile.experienceLevel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{fileName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Roles */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Target Roles
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.targetRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* Focus Topics */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Interview Topics
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.focusTopics.map((topic) => (
              <Badge
                key={topic}
                className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        {/* Red Flags */}
        {profile.redFlags.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Areas to Address
              </span>
            </div>
            <ul className="space-y-1">
              {profile.redFlags.map((flag, i) => (
                <li
                  key={i}
                  className="text-xs text-yellow-700 flex items-start gap-1.5"
                >
                  <span className="mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Technical Skills
          </span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.skills.technical.slice(0, 8).map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="text-xs"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}