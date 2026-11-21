using UnrealBuildTool;
using System.Collections.Generic;

public class JCHolyOGTarget : TargetRules
{
    public JCHolyOGTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("JCHolyOG");
    }
}
