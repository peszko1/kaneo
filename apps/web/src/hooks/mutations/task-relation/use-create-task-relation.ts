import { useMutation, useQueryClient } from "@tanstack/react-query";
import createTaskRelation from "@/fetchers/task-relation/create-task-relation";

import { invalidateRelationTaskProject } from "./invalidate-relation-task-project";

function useCreateTaskRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTaskRelation,
    onSuccess: (_, variables) => {
      void invalidateRelationTaskProject(queryClient, variables.sourceTaskId);
      queryClient.invalidateQueries({
        queryKey: ["task-relations", variables.sourceTaskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-relations", variables.targetTaskId],
      });
      // The API copies the parent's labels onto a new subtask.
      if (variables.relationType === "subtask")
        queryClient.invalidateQueries({
          queryKey: ["labels", variables.targetTaskId],
        });
    },
  });
}

export default useCreateTaskRelation;
