using UnrealBuildTool;
using System.Collections.Generic;

public class JCHolyOGEditorTarget : TargetRules
{
    public JCHolyOGEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("JCHolyOG");
    }
}
